"""Routes du Bot IA."""
from flask import Blueprint, jsonify, request

from server import settings
from server.core.providers import PROVIDERS, key_set
from server.services import ai
from .helpers import run

bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@bp.get("/status")
def status():
    return jsonify(ai.snapshot())


@bp.post("/config")
def config():
    return run(lambda: ai.update_config(request.get_json()))


def _require_key():
    provider = ai.config["provider"]
    if not key_set(provider):
        raise ValueError(f"{PROVIDERS[provider]['env']} absente (.env)")


def _start():
    _require_key()
    if ai.config["mode"] == "live" and not settings.kraken_configured():
        raise ValueError("Clés Kraken absentes (.env)")
    ai.start()


def _analyze():
    _require_key()
    ai.analyze_now()


@bp.post("/start")
def start():
    return run(_start)


@bp.post("/analyze")
def analyze():
    return run(_analyze)


@bp.post("/stop")
def stop():
    return run(ai.stop)


@bp.post("/liquidate")
def liquidate():
    return run(ai.liquidate)


@bp.post("/reset")
def reset():
    def reset_all():
        ai.stop()
        ai.reset_paper()
    return run(reset_all)


@bp.post("/close-<position_id>")
def close(position_id):
    return run(lambda: ai.close_position(position_id))
