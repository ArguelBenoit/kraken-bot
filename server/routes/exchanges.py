"""Route d'un échange du Bot IA avec son modèle (demande et réponse), ouvert depuis une décision."""
from flask import Blueprint, jsonify

from server.core import exchanges

bp = Blueprint("exchanges", __name__, url_prefix="/api/exchanges")


@bp.get("/<exchange_id>")
def one(exchange_id):
    found = exchanges.get(exchange_id)
    return (jsonify(found), 200) if found else (jsonify(ok=False, error="Échange introuvable (trop ancien : seuls les derniers sont gardés)"), 404)
