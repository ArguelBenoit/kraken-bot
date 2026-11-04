"""Petits utilitaires communs aux routes."""
from flask import jsonify


def run(action):
    """Exécute `action()` et répond {ok: true} ; toute exception devient {ok: false, error} en HTTP 400 (message affichable)."""
    try:
        action()
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400
