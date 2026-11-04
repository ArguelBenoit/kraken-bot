"""Chemins du projet et variables d'environnement.

Les fichiers de réglages et d'état (config.json, state.json, ai_*.json, manual_*.json, learn_state.json) vivent à la racine du projet ;
ils sont ignorés par git.
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "web" / "dist"          # build de l'interface React (npm run build)


def data_file(name):
    """Chemin d'un fichier de données (réglages / état) à la racine du projet."""
    return ROOT / name


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


def claude_configured():
    return is_set("ANTHROPIC_API_KEY")


def kraken_configured():
    """Clés Kraken complètes (nécessaires seulement pour le mode live)."""
    return is_set("KRAKEN_API_KEY") and is_set("KRAKEN_API_SECRET")
