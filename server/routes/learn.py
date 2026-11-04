"""Routes de la progression du tutoriel (aucun trading : la page Apprendre est une simulation côté navigateur)."""
from flask import Blueprint, jsonify, request

from server.features import learn

bp = Blueprint("learn", __name__, url_prefix="/api/learn")


@bp.get("/progress")
def get_progress():
    return jsonify(learn.load())


@bp.put("/progress")
def put_progress():
    return jsonify(learn.save(request.get_json(silent=True)))


@bp.post("/reset")
def reset():
    return jsonify(learn.reset())
