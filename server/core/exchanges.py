"""Journal des échanges avec les modèles : la demande envoyée (consignes, contexte, outil imposé) et la réponse reçue, pour la page « Échanges IA ».
En mémoire seulement (les derniers `KEPT`, perdus au redémarrage du serveur) ; le backtest n'y écrit pas (trop d'appels)."""
import threading
import time
import uuid
from collections import deque

KEPT = 40
_lock = threading.Lock()
_items = deque(maxlen=KEPT)          # le plus récent en premier


def begin(source, provider, model, system, user, tool):
    """Ouvre un échange « en cours » au moment de l'envoi et le renvoie (à clore avec `finish`)."""
    entry = {"id": uuid.uuid4().hex[:8], "source": source, "at": time.strftime("%H:%M:%S"), "provider": provider, "model": model,
             "system": system, "user": user, "tool": tool, "status": "pending", "response": None, "usage": {"in": 0, "out": 0},
             "seconds": 0.0, "error": "", "_t0": time.time()}
    with _lock:
        _items.appendleft(entry)
    return entry


def finish(entry, status, response=None, usage=None, error=""):
    """Clôt un échange : `status` = ok, error ou cancelled."""
    with _lock:
        entry.update(status=status, response=response, usage=usage or entry["usage"], error=error, seconds=round(time.time() - entry["_t0"], 1))


def _public(entry):
    return {k: v for k, v in entry.items() if not k.startswith("_")}


def snapshot():
    """Liste résumée (sans les textes), du plus récent au plus ancien."""
    with _lock:
        return [{**{k: v for k, v in _public(e).items() if k not in ("system", "user", "tool", "response")},
                 "chars": len(e["system"]) + len(e["user"])} for e in _items]


def get(exchange_id):
    """Un échange complet, ou None."""
    with _lock:
        found = next((e for e in _items if e["id"] == exchange_id), None)
        return _public(found) if found else None


def clear():
    """Vide le journal."""
    with _lock:
        _items.clear()
