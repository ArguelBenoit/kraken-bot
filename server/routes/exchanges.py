"""Routes du journal des échanges avec les modèles (page « Échanges IA »)."""
from flask import Blueprint, jsonify

from server.core import exchanges
from .helpers import run

bp = Blueprint("exchanges", __name__, url_prefix="/api/exchanges")


@bp.get("")
def listing():
    return jsonify(exchanges=exchanges.snapshot())


@bp.get("/<exchange_id>")
def one(exchange_id):
    found = exchanges.get(exchange_id)
    return (jsonify(found), 200) if found else (jsonify(ok=False, error="Échange introuvable"), 404)


@bp.delete("")
def clear():
    return run(exchanges.clear)
