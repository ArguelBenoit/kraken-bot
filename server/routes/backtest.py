"""Routes du backtest du Bot IA."""
from flask import Blueprint, jsonify, request

from server.services import backtest
from .helpers import run

bp = Blueprint("backtest", __name__, url_prefix="/api/backtest")


@bp.get("/status")
def status():
    return jsonify(backtest.snapshot())


@bp.post("/start")
def start():
    return run(lambda: backtest.start(request.get_json() or {}))


@bp.post("/cancel")
def cancel():
    return run(backtest.cancel)


@bp.post("/pause")
def pause():
    return run(backtest.pause)


@bp.post("/resume")
def resume():
    return run(backtest.resume)


@bp.get("/<run_id>")
def one(run_id):
    found = backtest.get(run_id)
    return (jsonify(found), 200) if found else (jsonify(ok=False, error="Essai introuvable"), 404)


@bp.delete("/<run_id>")
def delete(run_id):
    return run(lambda: backtest.delete(run_id))
