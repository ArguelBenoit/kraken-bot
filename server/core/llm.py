"""Appel d'un modèle de langage avec un outil, quel que soit le fournisseur : renvoie les arguments de l'outil appelé.

Trois formats : Anthropic (API Messages), « compatible OpenAI » (`/chat/completions`, que parlent OpenAI, Gemini, Mistral, Groq,
DeepSeek, xAI et OpenRouter) et Ollama (API native, modèles locaux). Les outils sont décrits une fois, au format Anthropic (`name`, `description`, `input_schema`).
Les modèles actuels refusent souvent un `tool_choice` forcé : on laisse `auto` et on exige l'appel dans le prompt système.
"""
import json
import os
import re

from .providers import PROVIDERS, base_url
from .transport import LlmError, api_error, stream_lines


def _sse(lines):
    """Charges JSON des évènements SSE (lignes `data: …`), jusqu'à `[DONE]`."""
    for line in lines:
        if not line.startswith("data:"):
            continue
        payload = line[5:].strip()
        if payload == "[DONE]":
            return
        try:
            yield json.loads(payload)
        except ValueError:
            continue


def _args(raw, usage):
    """Arguments d'un appel d'outil reçus en texte JSON."""
    try:
        return json.loads(raw or "{}")
    except ValueError:
        raise LlmError("Arguments de l'outil illisibles (JSON invalide) : modèle trop faible pour cet usage ?", usage=usage)


def _anthropic(provider, key, model, system, user, tool, max_tokens, timeout, cancel):
    body = {"model": model, "max_tokens": max_tokens, "system": system, "tools": [tool], "stream": True,
            "tool_choice": {"type": "auto"}, "messages": [{"role": "user", "content": user}]}
    headers = {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}
    blocks, usage = {}, {"in": 0, "out": 0}
    for ev in _sse(stream_lines(provider["url"], headers, body, timeout, provider["label"], cancel)):
        kind = ev.get("type")
        if kind == "message_start":
            usage["in"] = (ev.get("message") or {}).get("usage", {}).get("input_tokens", 0)
        elif kind == "content_block_start":
            blocks[ev.get("index")] = {**(ev.get("content_block") or {}), "json": "", "text": ""}
        elif kind == "content_block_delta" and ev.get("index") in blocks:
            delta, block = ev.get("delta") or {}, blocks[ev["index"]]
            block["json"] += delta.get("partial_json", "")
            block["text"] += delta.get("text", "")
        elif kind == "message_delta":
            usage["out"] = (ev.get("usage") or {}).get("output_tokens", usage["out"])
        elif kind == "error":
            raise api_error(200, json.dumps(ev.get("error") or ev), provider["label"])
    for b in blocks.values():
        if b.get("type") == "tool_use" and b.get("name") == tool["name"]:
            return _args(b["json"], usage), usage
    raise _no_call(tool, " ".join(b["text"] for b in blocks.values() if b.get("type") == "text"), usage)


def _openai(provider, key, model, system, user, tool, max_tokens, timeout, cancel):
    function = {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["input_schema"]}
    body = {"model": model, provider["max_tokens_param"]: max_tokens, "tool_choice": "auto", "stream": True, "stream_options": {"include_usage": True},
            "tools": [{"type": "function", "function": function}],
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    headers = {"Authorization": f"Bearer {key}", "content-type": "application/json"}
    calls, said, usage = [], [], {"in": 0, "out": 0}
    for ev in _sse(stream_lines(provider["url"], headers, body, timeout, provider["label"], cancel)):
        if ev.get("error"):
            raise api_error(200, json.dumps(ev["error"]), provider["label"])
        if ev.get("usage"):
            usage = {"in": ev["usage"].get("prompt_tokens", 0), "out": ev["usage"].get("completion_tokens", 0)}
        delta = ((ev.get("choices") or [{}])[0]).get("delta") or {}
        said.append(delta.get("content") or "")
        for part in delta.get("tool_calls") or []:
            fn = part.get("function") or {}
            if fn.get("name") or not calls:         # le nom n'arrive qu'au début de chaque appel ; la suite n'ajoute que des arguments
                calls.append({"name": fn.get("name", ""), "args": ""})
            calls[-1]["args"] += fn.get("arguments") or ""
    for call in calls:
        if call["name"] == tool["name"]:
            return _args(call["args"], usage), usage
    raise _no_call(tool, "".join(said), usage)


def _no_call(tool, said, usage):
    said = said.strip()[:200]
    return LlmError(f"Le modèle n'a pas appelé l'outil `{tool['name']}`" + (f" : {said}" if said else ""), usage=usage)


def _json_in(text, tool):
    """Premier objet JSON du texte d'un modèle (clôtures ``` et blocs <think> ignorés) s'il ressemble aux arguments de l'outil, sinon None."""
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S)
    start = text.find("{")
    if start < 0:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[start:])
    except ValueError:
        return None
    return obj if isinstance(obj, dict) and set(obj) & set(tool["input_schema"].get("properties", {})) else None


def _ollama_args(data, tool):
    """Arguments de l'outil dans une réponse Ollama : appel d'outil, sinon objet JSON écrit dans le texte ; None si rien d'exploitable."""
    message = data.get("message") or {}
    for call in message.get("tool_calls") or []:
        fn = call.get("function") or {}
        if fn.get("name") == tool["name"]:
            args = fn.get("arguments")
            return json.loads(args) if isinstance(args, str) else args or {}
    return _json_in(message.get("content"), tool)


def _ollama_reply(lines, name):
    """Réponse Ollama (une ligne JSON par morceau) rassemblée en un seul message, au format d'une réponse non diffusée."""
    message, counts = {"content": "", "tool_calls": []}, {}
    for line in lines:
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        if ev.get("error"):
            raise api_error(200, str(ev["error"]), name)
        part = ev.get("message") or {}
        message["content"] += part.get("content") or ""
        message["tool_calls"] += part.get("tool_calls") or []
        if ev.get("done"):
            counts = {k: ev.get(k, 0) for k in ("prompt_eval_count", "eval_count")}
    return {"message": message, **counts}


_NO_TOOLS = set()     # modèles Ollama qui refusent les outils : on passe directement en sortie JSON contrainte


def _ollama(provider, key, model, system, user, tool, max_tokens, timeout, cancel):
    """Ollama : d'abord avec l'outil ; si le modèle ne gère pas les outils (ou n'en appelle aucun), seconde passe en sortie JSON contrainte par le schéma."""
    url = base_url(provider) + "/api/chat"
    options = {"num_ctx": int(os.getenv("OLLAMA_NUM_CTX") or provider["num_ctx"]), "num_predict": max(max_tokens, 4096)}
    base = {"model": model, "stream": True, "options": options, "keep_alive": provider["keep_alive"]}
    function = {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["input_schema"]}
    json_system = f"{system}\n\nRéponds UNIQUEMENT par un objet JSON conforme au schéma de l'outil `{tool['name']}`, sans aucun texte autour."
    usage = {"in": 0, "out": 0}
    for with_tools in (False,) if model in _NO_TOOLS else (True, False):
        body = {**base, "messages": [{"role": "system", "content": system if with_tools else json_system}, {"role": "user", "content": user}]}
        body.update({"tools": [{"type": "function", "function": function}]} if with_tools else {"format": tool["input_schema"]})
        try:
            data = _ollama_reply(stream_lines(url, {"content-type": "application/json"}, body, timeout, provider["label"], cancel), provider["label"])
        except LlmError as e:
            if with_tools and "does not support tools" in str(e):
                _NO_TOOLS.add(model)
                continue
            raise
        usage = {"in": usage["in"] + data.get("prompt_eval_count", 0), "out": usage["out"] + data.get("eval_count", 0)}
        args = _ollama_args(data, tool)
        if args is not None:
            return args, usage
        last = (data.get("message") or {}).get("content", "")
    raise _no_call(tool, last, usage)


_CLIENTS = {"anthropic": _anthropic, "openai": _openai, "ollama": _ollama}


def call_tool(provider_id, model, system, user, tool, max_tokens=2000, timeout=None, cancel=None):
    """Envoie `user` au modèle `model` du fournisseur `provider_id` et renvoie `(arguments_de_l_outil, {"in": tokens, "out": tokens})`. `cancel` (un `Cancel`) permet de l'interrompre depuis un autre thread."""
    provider = PROVIDERS.get(provider_id)
    if not provider:
        raise LlmError(f"Fournisseur inconnu : {provider_id}", 400)
    key = os.getenv(provider["env"])
    if not key and not provider.get("keyless"):
        raise LlmError(f"{provider['env']} absente (.env) : ajoute-la puis relance le serveur.", 400)
    if not model:
        raise LlmError("Aucun modèle choisi.", 400)
    return _CLIENTS[provider["format"]](provider, key, model, system, user, tool, max_tokens, timeout or provider.get("timeout", 90), cancel)

