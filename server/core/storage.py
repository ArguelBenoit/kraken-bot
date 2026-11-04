"""Lecture / écriture JSON des fichiers de réglages et d'état."""
import json
import os


def load_json(path, default=None):
    """Contenu JSON du fichier, ou `default` s'il est absent ou illisible."""
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def save_json(path, data):
    """Écriture atomique (fichier temporaire puis remplacement) : jamais de fichier à moitié écrit."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=1))
    os.replace(tmp, path)
