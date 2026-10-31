import os
from pathlib import Path
from flask import Flask, jsonify, render_template, request

env = Path(__file__).parent / ".env"
if env.exists():
    for line in env.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from bot import Bot, scan

app = Flask(__name__)
bot = Bot()


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/status")
def status():
    return jsonify(bot.snapshot())


@app.get("/api/chart")
def chart():
    try:
        return jsonify(bot.chart(request.args.get('pair'), request.args.get('tf')))
    except Exception as e:
        return jsonify(error=str(e)), 502


@app.get("/api/scan")
def scan_route():
    try:
        tf = int(request.args.get("tf", 240))
        if tf not in (15, 60, 240, 1440):
            raise ValueError("timeframe invalide")
        return jsonify(scan(tf, bot.config["rsi_period"]))
    except Exception as e:
        return jsonify(error=str(e)), 502


@app.post("/api/config")
def config():
    try:
        bot.update_config(request.get_json())
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400


@app.post("/api/presets")
def pin():
    try:
        bot.pin_preset((request.get_json() or {}).get("name"))
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400


@app.delete("/api/presets/<pid>")
def unpin(pid):
    try:
        bot.unpin_preset(pid)
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400


@app.post("/api/<action>")
def action(action):
    if action == "start":
        if bot.config["mode"] == "live" and not (os.getenv("KRAKEN_API_KEY") and os.getenv("KRAKEN_API_SECRET")):
            return jsonify(ok=False, error="Clés API absentes (.env)"), 400
        bot.start()
    elif action == "stop":
        bot.stop()
    elif action == "liquidate":
        try:
            bot.liquidate()
        except Exception as e:
            return jsonify(ok=False, error=str(e)), 400
    elif action == "reset":
        bot.stop()          # coupe le bot s'il tourne, puis réinitialise
        bot.reset_paper()
    else:
        return jsonify(ok=False), 404
    return jsonify(ok=True)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
