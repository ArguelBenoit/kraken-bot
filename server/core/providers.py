"""Fournisseurs de modèles : adresse de l'API, variable d'environnement de la clé et quelques modèles d'exemple (repli quand la liste officielle est inaccessible).

`format` : `anthropic` (API Messages), `openai` (compatible `/chat/completions`) ou `ollama` (API native, modèle local sans clé :
adresse dans `OLLAMA_URL`, défaut `http://localhost:11434`). Les noms de modèles évoluent vite : la liste
`models` n'est qu'un exemple ; l'interface demande la liste réelle à l'API du fournisseur (`core/models.py`).
"""
import os

import requests

from server import settings
from .cache import memo

_OPENAI_LIKE = {"format": "openai", "max_tokens_param": "max_tokens"}

PROVIDERS = {
    "anthropic": {"label": "Claude (Anthropic)", "format": "anthropic", "env": "ANTHROPIC_API_KEY",
                  "url": "https://api.anthropic.com/v1/messages",
                  "models": ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1"]},
    "openai": {"label": "OpenAI", **_OPENAI_LIKE, "max_tokens_param": "max_completion_tokens", "env": "OPENAI_API_KEY",
               "url": "https://api.openai.com/v1/chat/completions", "models": ["gpt-5", "gpt-5-mini"]},
    "gemini": {"label": "Google Gemini", **_OPENAI_LIKE, "env": "GEMINI_API_KEY",
               "url": "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
               "models": ["gemini-2.5-pro", "gemini-2.5-flash"]},
    "mistral": {"label": "Mistral", **_OPENAI_LIKE, "env": "MISTRAL_API_KEY",
                "url": "https://api.mistral.ai/v1/chat/completions", "models": ["mistral-large-latest", "mistral-small-latest"]},
    "groq": {"label": "Groq", **_OPENAI_LIKE, "env": "GROQ_API_KEY",
             "url": "https://api.groq.com/openai/v1/chat/completions", "models": ["llama-3.3-70b-versatile"]},
    "deepseek": {"label": "DeepSeek", **_OPENAI_LIKE, "env": "DEEPSEEK_API_KEY",
                 "url": "https://api.deepseek.com/v1/chat/completions", "models": ["deepseek-chat"]},
    "xai": {"label": "xAI (Grok)", **_OPENAI_LIKE, "env": "XAI_API_KEY",
            "url": "https://api.x.ai/v1/chat/completions", "models": ["grok-4"]},
    "openrouter": {"label": "OpenRouter", **_OPENAI_LIKE, "env": "OPENROUTER_API_KEY",
                   "url": "https://openrouter.ai/api/v1/chat/completions",
                   "models": ["anthropic/claude-sonnet-5-5", "google/gemini-2.5-pro", "openai/gpt-5"]},
    # Local : pas de clé. API native (et non /v1) pour fixer la fenêtre de contexte, que Ollama laisse sinon trop petite pour le prompt du bot.
    "ollama": {"label": "Ollama (local)", "format": "ollama", "env": "OLLAMA_URL", "keyless": True, "default_url": "http://localhost:11434",
               "timeout": 300, "num_ctx": 8192, "keep_alive": "10m", "models": ["qwen3:8b", "llama3.1:8b", "gemma3:12b"]},
}
DEFAULT_PROVIDER, DEFAULT_MODEL = "anthropic", "claude-sonnet-5-5"


def check_choice(provider, model):
    """Valide un choix fournisseur + modèle et renvoie le modèle nettoyé, ou lève ValueError."""
    if provider not in PROVIDERS:
        raise ValueError("fournisseur inconnu")
    model = str(model or "").strip()
    if not model or len(model) > 100:
        raise ValueError("modèle invalide (identifiant du fournisseur, 100 caractères max)")
    return model


def key_set(provider):
    """La clé du fournisseur est-elle définie dans l'environnement ? (toujours vrai pour un modèle local, qui n'en a pas)"""
    p = PROVIDERS.get(provider)
    return bool(p) and (p.get("keyless", False) or settings.is_set(p["env"]))


def base_url(provider):
    """Adresse d'un fournisseur local : variable d'environnement ou défaut, sans « / » final."""
    return (os.getenv(provider["env"]) or provider["default_url"]).rstrip("/")


def _reachable(url):
    try:
        return requests.get(url, timeout=1.5).status_code == 200
    except requests.RequestException:
        return False


def connected(provider):
    """Fournisseur utilisable : clé définie, ou (modèle local) serveur qui répond (vérifié au plus toutes les 15 s)."""
    p = PROVIDERS[provider]
    if p.get("keyless"):
        return memo(("up", provider), 15, lambda: _reachable(base_url(p) + "/api/tags"))
    return key_set(provider)


def public():
    """Fournisseurs pour l'interface : libellé, modèles d'exemple, connecté ou non (clé définie / serveur local joignable ; jamais la clé)."""
    return {k: {"label": v["label"], "models": v["models"], "env": v["env"], "connected": connected(k), "local": v.get("keyless", False)}
            for k, v in PROVIDERS.items()}
