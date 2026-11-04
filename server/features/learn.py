"""Progression du tutoriel (page /learn) : quiz réussis et épreuves validées, dans `learn_state.json` comme les autres pages.
Ne contient AUCUN trading : la page Apprendre est 100 % simulation côté navigateur ; ce fichier ne garde que l'avancement."""
import threading

from server import settings
from server.core.storage import load_json, save_json
from server.market.strategies import METHODS

STATE_FILE = settings.data_file("learn_state.json")
_lock = threading.Lock()


def _clean(d):
    """Ne garde que la forme attendue (le fichier peut être édité à la main, la requête peut être forgée)."""
    d = d if isinstance(d, dict) else {}
    trials = {}
    for m, r in (d.get("trials") or {}).items():
        if m not in METHODS or not isinstance(r, dict):
            continue
        t = {"quiz": bool(r.get("quiz")), "trade": bool(r.get("trade"))}
        try:
            t["attempts"] = max(0, min(int(r.get("attempts") or 0), 10_000))
        except (TypeError, ValueError):
            t["attempts"] = 0
        if isinstance(r.get("bestPct"), (int, float)) and not isinstance(r.get("bestPct"), bool):
            t["bestPct"] = float(r["bestPct"])
        if isinstance(r.get("validatedAt"), str):
            t["validatedAt"] = r["validatedAt"][:20]
        trials[m] = t
    done = {str(k)[:40]: True for k, v in list((d.get("lessonsDone") or {}).items())[:100] if v}
    return {"trials": trials, "lessonsDone": done}


def load():
    """Progression enregistrée (nettoyée), ou une progression vide."""
    with _lock:
        return _clean(load_json(STATE_FILE))


def save(data):
    """Enregistre la progression reçue après nettoyage et renvoie ce qui a été retenu."""
    clean = _clean(data)
    with _lock:
        save_json(STATE_FILE, clean)
    return clean


def reset():
    return save({})
