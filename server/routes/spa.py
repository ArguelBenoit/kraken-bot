"""Sert l'interface React construite (web/dist) : fichiers statiques, sinon index.html (le routage est côté navigateur)."""
from flask import Blueprint, Response, abort, send_from_directory

from server import settings

bp = Blueprint("spa", __name__)


@bp.get("/", defaults={"path": ""})
@bp.get("/<path:path>")
def serve(path):
    if path.startswith("api/"):
        abort(404)
    if not (settings.DIST / "index.html").exists():
        return Response("Interface non construite. Lance ./run.sh (développement) ou ./run.sh prod.", 503)
    if path and (settings.DIST / path).is_file():
        return send_from_directory(settings.DIST, path)
    return send_from_directory(settings.DIST, "index.html")
