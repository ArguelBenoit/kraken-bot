"""Échanges du Bot IA avec son modèle : la demande envoyée (consignes + contexte) et la réponse reçue, affichés dans une fenêtre en cliquant sur une décision.
Les derniers `KEPT` sont gardés dans `data/ai_exchanges.json` (ils survivent au redémarrage). Le backtest garde les siens dans chaque essai."""
import threading
import time
import uuid

from server import settings
from .storage import load_json, save_json

KEPT = 60                                  # un peu plus que les décisions affichées (bot.MAX_DECISIONS_KEPT)
FILE = settings.data_file("ai_exchanges.json")
_lock = threading.Lock()
_items = load_json(FILE, [])               # le plus ancien en premier
for _e in _items:
    if _e.get("status") == "pending":      # serveur arrêté pendant l'appel
        _e["status"] = "cancelled"


def begin(provider, model, system, user):
    """Ouvre un échange au moment de l'envoi et le renvoie (à clore avec `finish`)."""
    entry = {"id": uuid.uuid4().hex[:8], "at": time.strftime("%d/%m %H:%M:%S"), "provider": provider, "model": model, "system": system, "user": user,
             "status": "pending", "response": None, "usage": {"in": 0, "out": 0}, "seconds": 0.0, "error": "", "t0": time.time()}
    with _lock:
        _items.append(entry)
        del _items[:-KEPT]
    return entry


def finish(entry, status, response=None, usage=None, error=""):
    """Clôt un échange (`status` = ok, error ou cancelled) et enregistre le journal."""
    with _lock:
        entry.update(status=status, response=response, usage=usage or entry["usage"], error=error, seconds=round(time.time() - entry.pop("t0"), 1))
        save_json(FILE, _items)


def get(exchange_id):
    """Un échange complet, ou None s'il a été oublié (au-delà des `KEPT` derniers)."""
    with _lock:
        return next((e for e in _items if e["id"] == exchange_id), None)
