"""Progression du tutoriel (page /learn) : quiz réussis et épreuves validées, dans `learn_state.json` comme les autres pages.
Ne contient AUCUN trading : la page Apprendre est 100 % simulation côté navigateur ; ce fichier ne garde que l'avancement."""
import json, os, threading
from pathlib import Path

STATE_FILE = Path(__file__).parent / "learn_state.json"
METHODS = ("rsi", "bollinger", "trend", "donchian", "macd", "momentum")
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
    with _lock:
        try:
            return _clean(json.loads(STATE_FILE.read_text()))
        except Exception:
            return _clean({})


def save(data):
    c = _clean(data)
    with _lock:
        tmp = STATE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(c, indent=1))
        os.replace(tmp, STATE_FILE)          # écriture atomique : pas de fichier à moitié écrit
    return c


def reset():
    return save({})
