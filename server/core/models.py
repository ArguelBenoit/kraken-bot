"""Liste des modèles de conversation d'un fournisseur, demandée à son API (`/models`, `/api/tags` pour Ollama)."""
import os

import requests

from .cache import memo
from .transport import LlmError
from .providers import PROVIDERS, base_url

# Identifiants qui ne sont pas des modèles de conversation (embeddings, voix, images, modération…) : écartés de la liste.
_NOT_CHAT = ("embed", "tts", "whisper", "transcribe", "dall-e", "moderation", "image", "audio", "realtime", "rerank", "guard", "vision-preview")


def _fetch_models(provider_id, key):
    provider = PROVIDERS[provider_id]
    if provider["format"] == "anthropic":
        url, headers = provider["url"].removesuffix("/messages") + "/models?limit=1000", {"x-api-key": key, "anthropic-version": "2023-06-01"}
    elif provider["format"] == "ollama":
        url, headers = base_url(provider) + "/api/tags", {}
    else:
        url, headers = provider["url"].removesuffix("/chat/completions") + "/models", {"Authorization": f"Bearer {key}"}
    try:
        r = requests.get(url, headers=headers, timeout=15)
    except requests.RequestException as e:
        raise LlmError(f"{provider['label']} injoignable ({url}){' : lance `ollama serve`' if provider['format'] == 'ollama' else ''}")
    if r.status_code != 200:
        raise LlmError(f"{provider['label']} {r.status_code} : {r.text[:150]}")
    data = r.json()
    ids = (m.get("name", "") for m in data.get("models", [])) if provider["format"] == "ollama" else (m.get("id", "").removeprefix("models/") for m in data.get("data", []))
    found = sorted(i for i in ids if i and not any(w in i.lower() for w in _NOT_CHAT))
    if not found and provider["format"] == "ollama":
        raise LlmError(f"Aucun modèle installé dans Ollama : lance par exemple `ollama pull {provider['models'][0]}`.")
    return found


def list_models(provider_id):
    """Modèles de conversation que la clé du fournisseur peut utiliser (API `/models`, mémorisée 10 min, 30 s pour un modèle local) ; LlmError si clé absente ou API en échec."""
    provider = PROVIDERS.get(provider_id)
    if not provider:
        raise LlmError(f"Fournisseur inconnu : {provider_id}", 400)
    key = os.getenv(provider["env"])
    if not key and not provider.get("keyless"):
        raise LlmError(f"{provider['env']} absente (.env)", 400)
    return memo(("models", provider_id), 30 if provider.get("keyless") else 600, lambda: _fetch_models(provider_id, key))
