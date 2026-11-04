"""Client minimal de l'API Messages d'Anthropic avec un outil : renvoie les arguments de l'outil que Claude a appelé.

Les modèles actuels refusent un `tool_choice` forcé : on laisse `auto` et on exige l'appel dans le prompt système.
"""
import os

import requests

API_URL = "https://api.anthropic.com/v1/messages"


class ClaudeError(Exception):
    """Échec d'un appel à Claude. `status` = code HTTP à renvoyer à l'interface ; `usage` = tokens consommés malgré l'échec."""

    def __init__(self, message, status=502, usage=None):
        super().__init__(message)
        self.status = status
        self.usage = usage or {"in": 0, "out": 0}


class CreditError(ClaudeError):
    """Crédit Anthropic épuisé : inutile de réessayer tant que le compte n'est pas rechargé."""


def call_tool(model, system, user, tool, max_tokens=2000, timeout=90):
    """Envoie `user` à Claude et renvoie `(arguments_de_l_outil, {"in": tokens, "out": tokens})`."""
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise ClaudeError("ANTHROPIC_API_KEY absente (.env) : ajoute-la puis relance le serveur.", 400)
    try:
        r = requests.post(API_URL, timeout=timeout,
                          headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                          json={"model": model, "max_tokens": max_tokens, "system": system, "tools": [tool],
                                "tool_choice": {"type": "auto"}, "messages": [{"role": "user", "content": user}]})
    except requests.RequestException as e:
        raise ClaudeError(f"API Claude injoignable : {e}")
    if r.status_code != 200:
        if "credit balance" in r.text:
            raise CreditError("Crédit Anthropic épuisé : recharge dans la console (Plans & Billing).")
        raise ClaudeError(f"API Claude {r.status_code} : {r.text[:200]}")

    data = r.json()
    raw = data.get("usage", {})
    usage = {"in": raw.get("input_tokens", 0), "out": raw.get("output_tokens", 0)}
    blocks = data.get("content", [])
    for b in blocks:
        if b.get("type") == "tool_use" and b.get("name") == tool["name"]:
            return b["input"], usage
    said = " ".join(b.get("text", "") for b in blocks if b.get("type") == "text")[:200]
    raise ClaudeError(f"Claude n'a pas appelé l'outil `{tool['name']}`" + (f" : {said}" if said else ""), usage=usage)
