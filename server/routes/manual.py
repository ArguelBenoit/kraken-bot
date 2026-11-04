"""Routes du trading manuel. Tout ordre ou vente LIVE exige `confirm: true` dans la requête (filet de sécurité côté serveur)."""
from flask import Blueprint, jsonify, request

from server.core.claude import ClaudeError
from server.features import proposals
from server.services import ai, manual
from .helpers import run

bp = Blueprint("manual", __name__, url_prefix="/api/manual")


def _live_unconfirmed(body, what):
    """Réponse d'erreur si une opération LIVE n'a pas été confirmée explicitement, sinon None."""
    if manual.config["mode"] == "live" and body.get("confirm") is not True:
        return jsonify(ok=False, error=f"Confirmation requise pour {what} LIVE"), 400
    return None


@bp.get("/status")
def status():
    return jsonify(manual.snapshot(request.args.get("pair")))


@bp.post("/config")
def config():
    return run(lambda: manual.update_config(request.get_json()))


@bp.post("/order")
def order():
    body = request.get_json() or {}
    return _live_unconfirmed(body, "un ordre") or run(lambda: manual.place_order(body))


@bp.post("/positions/<position_id>/close")
def close(position_id):
    body = request.get_json(silent=True) or {}
    return _live_unconfirmed(body, "une vente") or run(lambda: manual.close_position(position_id, body.get("fraction", 1.0)))


@bp.post("/positions/<position_id>/adjust")
def adjust(position_id):
    return run(lambda: manual.adjust_position(position_id, request.get_json() or {}))


@bp.delete("/pending/<order_id>")
def cancel(order_id):
    return run(lambda: manual.cancel_pending(order_id))


@bp.post("/reset")
def reset():
    return run(manual.reset_paper)


@bp.post("/propose")
def propose():
    """Claude propose quelques trades à prendre maintenant. Ne passe aucun ordre : l'interface pré-remplit le ticket."""
    try:
        return jsonify(ok=True, **proposals.propose(manual, ai.config["model"]))
    except ClaudeError as e:
        return jsonify(ok=False, error=str(e)), e.status
