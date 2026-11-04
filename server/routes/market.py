"""Routes du marché : tableau comparatif des paires et données du graphique (lecture seule, données publiques Kraken)."""
from flask import Blueprint, jsonify, request

from server.market import chart as chart_data
from server.market.scan import scan
from server.services import manual

bp = Blueprint("market", __name__, url_prefix="/api")


@bp.get("/chart")
def chart():
    try:
        mode = manual.config["mode"]
        trades = [t for t in manual.state["trades"] if t.get("mode") == mode]
        return jsonify(chart_data.chart(request.args.get("pair"), request.args.get("tf"), trades))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=str(e)), 502


@bp.get("/scan")
def scan_route():
    try:
        tf = int(request.args.get("tf", chart_data.DEFAULT_TF))
        if tf not in chart_data.TIMEFRAMES:
            raise ValueError("timeframe invalide")
        return jsonify(scan(tf))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    except Exception as e:
        return jsonify(error=str(e)), 502
