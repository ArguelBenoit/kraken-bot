"""Routes du bot simple : état, graphique, tableau Marché, réglages, contrôle et mode IA (suggestion de Claude)."""
from flask import Blueprint, jsonify, request

from server import settings
from server.core.claude import ClaudeError
from server.features import suggest
from server.market.scan import scan
from server.services import ai, bot
from .helpers import run

bp = Blueprint("simple", __name__, url_prefix="/api")
SCAN_TIMEFRAMES = (15, 60, 240, 1440)


@bp.get("/status")
def status():
    return jsonify({**bot.snapshot(), "ai_key": settings.claude_configured()})


@bp.get("/chart")
def chart():
    try:
        return jsonify(bot.chart(request.args.get("pair"), request.args.get("tf")))
    except Exception as e:
        return jsonify(error=str(e)), 502


@bp.get("/scan")
def scan_route():
    try:
        tf = int(request.args.get("tf", 240))
        if tf not in SCAN_TIMEFRAMES:
            raise ValueError("timeframe invalide")
        return jsonify(scan(tf, bot.config))
    except Exception as e:
        return jsonify(error=str(e)), 502


@bp.post("/config")
def config():
    return run(lambda: bot.update_config(request.get_json()))


@bp.post("/start")
def start():
    if bot.config["mode"] == "live" and not settings.kraken_configured():
        return jsonify(ok=False, error="Clés API absentes (.env)"), 400
    bot.start()
    return jsonify(ok=True)


@bp.post("/stop")
def stop():
    bot.stop()
    return jsonify(ok=True)


@bp.post("/liquidate")
def liquidate():
    return run(bot.liquidate)


@bp.post("/reset")
def reset():
    bot.stop()                      # coupe le bot s'il tourne, puis réinitialise
    bot.reset_paper()
    return jsonify(ok=True)


@bp.post("/suggest")
def suggest_config():
    """Mode IA : Claude propose le meilleur réglage du moment. Pré-remplit le formulaire côté interface, n'enregistre rien."""
    lock_pair = bool((request.get_json(silent=True) or {}).get("lock_pair"))
    try:
        return jsonify(ok=True, **suggest.propose(bot, lock_pair, ai.config["model"]))
    except ClaudeError as e:
        return jsonify(ok=False, error=str(e)), e.status
