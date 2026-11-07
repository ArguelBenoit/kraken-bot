"""Appel d'un modèle de langage avec un outil, quel que soit le fournisseur : renvoie les arguments de l'outil appelé.

Trois formats : Anthropic (API Messages), « compatible OpenAI » (`/chat/completions`, que parlent OpenAI, Gemini, Mistral, Groq,
DeepSeek, xAI et OpenRouter) et Ollama (API native, modèles locaux). Les outils sont décrits une fois, au format Anthropic (`name`, `description`, `input_schema`).
Les modèles actuels refusent souvent un `tool_choice` forcé : on laisse `auto` et on exige l'appel dans le prompt système.
"""
import json
import os
import re

import requests

from .providers import PROVIDERS, base_url


class LlmError(Exception):
    """Échec d'un appel au modèle. `status` = code HTTP à renvoyer à l'interface ; `usage` = tokens consommés malgré l'échec."""

    def __init__(self, message, status=502, usage=None):
        super().__init__(message)
        self.status = status
        self.usage = usage or {"in": 0, "out": 0}


class CreditError(LlmError):
    """Crédit ou quota du fournisseur épuisé : inutile de réessayer tant que le compte n'est pas rechargé."""


def _is_credit_problem(status, text):
    return status == 402 or any(s in text for s in ("credit balance", "insufficient_quota", "insufficient credits", "Insufficient Balance"))


def _post(url, headers, body, timeout, name):
    """POST JSON ; renvoie la réponse décodée ou lève LlmError / CreditError."""
    try:
        r = requests.post(url, headers=headers, json=body, timeout=timeout)
    except requests.RequestException as e:
        raise LlmError(f"{name} injoignable : {e}")
    if r.status_code != 200:
        if _is_credit_problem(r.status_code, r.text):
            raise CreditError(f"Crédit ou quota {name} épuisé : recharge ton compte chez le fournisseur.")
        raise LlmError(f"{name} {r.status_code} : {r.text[:200]}")
    return r.json()


def _anthropic(provider, key, model, system, user, tool, max_tokens, timeout):
    data = _post(provider["url"], {"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                 {"model": model, "max_tokens": max_tokens, "system": system, "tools": [tool],
                  "tool_choice": {"type": "auto"}, "messages": [{"role": "user", "content": user}]}, timeout, provider["label"])
    raw = data.get("usage", {})
    usage = {"in": raw.get("input_tokens", 0), "out": raw.get("output_tokens", 0)}
    blocks = data.get("content", [])
    for b in blocks:
        if b.get("type") == "tool_use" and b.get("name") == tool["name"]:
            return b["input"], usage
    said = " ".join(b.get("text", "") for b in blocks if b.get("type") == "text")
    raise _no_call(tool, said, usage)


def _openai(provider, key, model, system, user, tool, max_tokens, timeout):
    function = {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["input_schema"]}
    body = {"model": model, provider["max_tokens_param"]: max_tokens, "tool_choice": "auto",
            "tools": [{"type": "function", "function": function}],
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    data = _post(provider["url"], {"Authorization": f"Bearer {key}", "content-type": "application/json"}, body, timeout, provider["label"])
    raw = data.get("usage") or {}
    usage = {"in": raw.get("prompt_tokens", 0), "out": raw.get("completion_tokens", 0)}
    message = ((data.get("choices") or [{}])[0]).get("message") or {}
    for call in message.get("tool_calls") or []:
        fn = call.get("function") or {}
        if fn.get("name") == tool["name"]:
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except ValueError:
                raise LlmError("Arguments de l'outil illisibles (JSON invalide) : modèle trop faible pour cet usage ?", usage=usage)
            return args, usage
    raise _no_call(tool, message.get("content") or "", usage)


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


_NO_TOOLS = set()     # modèles Ollama qui refusent les outils : on passe directement en sortie JSON contrainte


def _ollama(provider, key, model, system, user, tool, max_tokens, timeout):
    """Ollama : d'abord avec l'outil ; si le modèle ne gère pas les outils (ou n'en appelle aucun), seconde passe en sortie JSON contrainte par le schéma."""
    url = base_url(provider) + "/api/chat"
    options = {"num_ctx": int(os.getenv("OLLAMA_NUM_CTX") or provider["num_ctx"]), "num_predict": max(max_tokens, 4096)}
    base = {"model": model, "stream": False, "options": options, "keep_alive": provider["keep_alive"]}
    function = {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["input_schema"]}
    json_system = f"{system}\n\nRéponds UNIQUEMENT par un objet JSON conforme au schéma de l'outil `{tool['name']}`, sans aucun texte autour."
    usage = {"in": 0, "out": 0}
    for with_tools in (False,) if model in _NO_TOOLS else (True, False):
        body = {**base, "messages": [{"role": "system", "content": system if with_tools else json_system}, {"role": "user", "content": user}]}
        body.update({"tools": [{"type": "function", "function": function}]} if with_tools else {"format": tool["input_schema"]})
        try:
            data = _post(url, {}, body, timeout, provider["label"])
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


def call_tool(provider_id, model, system, user, tool, max_tokens=2000, timeout=None):
    """Envoie `user` au modèle `model` du fournisseur `provider_id` et renvoie `(arguments_de_l_outil, {"in": tokens, "out": tokens})`."""
    provider = PROVIDERS.get(provider_id)
    if not provider:
        raise LlmError(f"Fournisseur inconnu : {provider_id}", 400)
    key = os.getenv(provider["env"])
    if not key and not provider.get("keyless"):
        raise LlmError(f"{provider['env']} absente (.env) : ajoute-la puis relance le serveur.", 400)
    if not model:
        raise LlmError("Aucun modèle choisi.", 400)
    return _CLIENTS[provider["format"]](provider, key, model, system, user, tool, max_tokens, timeout or provider.get("timeout", 90))

