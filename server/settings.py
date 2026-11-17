"""Chemins du projet et variables d'environnement.

Les fichiers de réglages et d'état (ai_*.json, manual_*.json, learn_state.json) et les marchés mémorisés du backtest (`scenarios/`)
vivent dans le dossier `data/` à la racine du projet ; il est ignoré par git.
"""
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "web" / "dist"          # build de l'interface React (npm run build)
DATA = ROOT / "data"


def data_file(name):
    """Chemin d'un fichier ou dossier de données dans `data/` (créé au besoin). Un fichier resté à l'ancien emplacement (racine du projet) y est déplacé une fois."""
    DATA.mkdir(exist_ok=True)
    old, new = ROOT / name, DATA / name
    if old.exists() and not new.exists():
        shutil.move(str(old), str(new))
    return new


def load_dotenv():
    """Charge `.env` sans écraser les variables déjà définies dans l'environnement."""
    env = ROOT / ".env"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def is_set(name):
    """Une variable d'environnement est-elle définie et non vide ? (on ne lit jamais sa valeur ailleurs)"""
    return bool(os.getenv(name))


def kraken_configured():
    """Clés Kraken complètes (nécessaires seulement pour le mode live)."""
    return is_set("KRAKEN_API_KEY") and is_set("KRAKEN_API_SECRET")
