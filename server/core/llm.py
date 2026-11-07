"""Appel d'un modèle de langage avec un outil, quel que soit le fournisseur : renvoie les arguments de l'outil appelé.

Deux formats suffisent : Anthropic (API Messages) et « compatible OpenAI » (`/chat/completions`), que parlent OpenAI, Gemini, Mistral,
Groq, DeepSeek, xAI et OpenRouter. Les outils sont décrits une fois, au format Anthropic (`name`, `description`, `input_schema`).
Les modèles actuels refusent souvent un `tool_choice` forcé : on laisse `auto` et on exige l'appel dans le prompt système.
"""
import json
import os

import requests

from .cache import memo
from .providers import PROVIDERS


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


_CLIENTS = {"anthropic": _anthropic, "openai": _openai}


def call_tool(provider_id, model, system, user, tool, max_tokens=2000, timeout=90):
    """Envoie `user` au modèle `model` du fournisseur `provider_id` et renvoie `(arguments_de_l_outil, {"in": tokens, "out": tokens})`."""
    provider = PROVIDERS.get(provider_id)
    if not provider:
        raise LlmError(f"Fournisseur inconnu : {provider_id}", 400)
    key = os.getenv(provider["env"])
    if not key:
        raise LlmError(f"{provider['env']} absente (.env) : ajoute-la puis relance le serveur.", 400)
    if not model:
        raise LlmError("Aucun modèle choisi.", 400)
    return _CLIENTS[provider["format"]](provider, key, model, system, user, tool, max_tokens, timeout)


# Identifiants qui ne sont pas des modèles de conversation (embeddings, voix, images, modération…) : écartés de la liste.
_NOT_CHAT = ("embed", "tts", "whisper", "transcribe", "dall-e", "moderation", "image", "audio", "realtime", "rerank", "guard", "vision-preview")


def _fetch_models(provider_id, key):
    provider = PROVIDERS[provider_id]
    if provider["format"] == "anthropic":
        url, headers = provider["url"].removesuffix("/messages") + "/models?limit=1000", {"x-api-key": key, "anthropic-version": "2023-06-01"}
    else:
        url, headers = provider["url"].removesuffix("/chat/completions") + "/models", {"Authorization": f"Bearer {key}"}
    try:
        r = requests.get(url, headers=headers, timeout=15)
    except requests.RequestException as e:
        raise LlmError(f"{provider['label']} injoignable : {e}")
    if r.status_code != 200:
        raise LlmError(f"{provider['label']} {r.status_code} : {r.text[:150]}")
    ids = (m.get("id", "").removeprefix("models/") for m in r.json().get("data", []))
    return sorted(i for i in ids if i and not any(w in i.lower() for w in _NOT_CHAT))


def list_models(provider_id):
    """Modèles de conversation que la clé du fournisseur peut utiliser (API `/models`, mémorisée 10 min) ; LlmError si clé absente ou API en échec."""
    provider = PROVIDERS.get(provider_id)
    if not provider:
        raise LlmError(f"Fournisseur inconnu : {provider_id}", 400)
    key = os.getenv(provider["env"])
    if not key:
        raise LlmError(f"{provider['env']} absente (.env)", 400)
    return memo(("models", provider_id), 600, lambda: _fetch_models(provider_id, key))
