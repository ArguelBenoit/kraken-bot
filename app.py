import hmac, os, time
from pathlib import Path
from flask import Flask, Response, abort, jsonify, request, send_from_directory

env = Path(__file__).parent / ".env"
if env.exists():
    for line in env.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

import kraken
from bot import Bot, scan
from ai_bot import AIBot
from manual import ManualTrader
import learn

DIST = Path(__file__).parent / "web" / "dist"      # build de l'interface React (npm run build)
app = Flask(__name__, static_folder=None)
bot = Bot()
ai = AIBot()
manual = ManualTrader()


@app.before_request
def _auth():
    """Mot de passe optionnel (APP_PASSWORD dans .env) : HTTP Basic, n'importe quel identifiant. Exigé sauf en localhost."""
    pw = os.getenv("APP_PASSWORD")
    if pw and request.remote_addr not in ("127.0.0.1", "::1"):     # pas de mot de passe en localhost
        a = request.authorization
        if not a or not hmac.compare_digest(a.password or "", pw):
            return Response("Mot de passe requis", 401, {"WWW-Authenticate": 'Basic realm="Kraken Bot"'})


_px_cache = {}


def _px(pair, ttl=4.0):
    """Dernier prix avec un petit cache (le menu interroge toutes les 4 s) ; None si Kraken est injoignable."""
    hit = _px_cache.get(pair)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    try:
        p = kraken.last_price(pair)
    except Exception:
        return hit[1] if hit else None
    _px_cache[pair] = (time.time(), p)
    return p


def _tally(positions):
    """(pair, prix d'entrée) -> nombre de positions en gain et en perte au prix actuel."""
    gain = loss = 0
    for pair, entry in positions:
        p = _px(pair)
        if p is None or not entry:
            continue
        gain += p > entry
        loss += p < entry
    return {"gain": int(gain), "loss": int(loss)}


@app.get("/api/activity")
def activity():
    """État des trois bots pour le menu : tourne-t-il ? positions ouvertes, et combien sont en gain / en perte."""
    bot_pos = [(bot.state.get("pair") or bot.config["pair"], bot.state.get("entry"))] if (bot.state.get("qty") or 0) > 0 else []
    ai_pos = [(p["pair"], p["entry"]) for p in list(ai.state["positions"])]
    man_pos = [(p["pair"], p["entry"]) for p in list(manual.state["positions"])]
    return jsonify(
        bot={"running": bot.running, "positions": len(bot_pos), **_tally(bot_pos)},
        ai={"running": ai.running, "positions": len(ai_pos), **_tally(ai_pos)},
        manual={"positions": len(man_pos), "pending": len(manual.state["pending"]), **_tally(man_pos)},
    )


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
        return jsonify(scan(tf, bot.config["rsi_period"], bot.config["ma_fast"], bot.config["ma_slow"], bot.config))
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


@app.get("/api/ai/status")
def ai_status():
    return jsonify(ai.snapshot())


@app.post("/api/ai/config")
def ai_config():
    try:
        ai.update_config(request.get_json())
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400


@app.post("/api/ai/<action>")
def ai_action(action):
    try:
        if action == "start":
            if not os.getenv("ANTHROPIC_API_KEY"):
                return jsonify(ok=False, error="ANTHROPIC_API_KEY absente (.env)"), 400
            if ai.config["mode"] == "live" and not (os.getenv("KRAKEN_API_KEY") and os.getenv("KRAKEN_API_SECRET")):
                return jsonify(ok=False, error="Clés Kraken absentes (.env)"), 400
            ai.start()
        elif action == "stop":
            ai.stop()
        elif action == "analyze":
            if not os.getenv("ANTHROPIC_API_KEY"):
                return jsonify(ok=False, error="ANTHROPIC_API_KEY absente (.env)"), 400
            ai.analyze_now()
        elif action == "liquidate":
            ai.liquidate()
        elif action == "reset":
            ai.stop()
            ai.reset_paper()
        elif action.startswith("close-"):
            ai.close_position(action[6:])
        else:
            return jsonify(ok=False), 404
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400


def _manual(fn):
    """Exécute une action du trading manuel : 400 + message en cas d'erreur (validation, Kraken…)."""
    try:
        fn()
        return jsonify(ok=True)
    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400


@app.get("/api/manual/status")
def manual_status():
    return jsonify(manual.snapshot(request.args.get("pair")))


@app.post("/api/manual/config")
def manual_config():
    return _manual(lambda: manual.update_config(request.get_json()))


@app.post("/api/manual/order")
def manual_order():
    body = request.get_json() or {}
    if manual.config["mode"] == "live" and body.get("confirm") is not True:      # filet de sécurité côté serveur
        return jsonify(ok=False, error="Confirmation requise pour un ordre LIVE"), 400
    return _manual(lambda: manual.place_order(body))


@app.post("/api/manual/positions/<pid>/close")
def manual_close(pid):
    body = request.get_json(silent=True) or {}
    if manual.config["mode"] == "live" and body.get("confirm") is not True:
        return jsonify(ok=False, error="Confirmation requise pour une vente LIVE"), 400
    return _manual(lambda: manual.close_position(pid, body.get("fraction", 1.0)))


@app.post("/api/manual/positions/<pid>/adjust")
def manual_adjust(pid):
    return _manual(lambda: manual.adjust_position(pid, request.get_json() or {}))


@app.delete("/api/manual/pending/<oid>")
def manual_cancel(oid):
    return _manual(lambda: manual.cancel_pending(oid))


@app.post("/api/manual/reset")
def manual_reset():
    return _manual(manual.reset_paper)


@app.get("/api/learn/progress")
def learn_get():
    return jsonify(learn.load())


@app.put("/api/learn/progress")
def learn_put():
    return jsonify(learn.save(request.get_json(silent=True)))


@app.post("/api/learn/reset")
def learn_reset():
    return jsonify(learn.reset())


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


@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path):
    """Interface React : fichiers du build, sinon index.html (routage côté client : /, /ai)."""
    if path.startswith("api/"):
        abort(404)
    if not (DIST / "index.html").exists():
        return Response("Interface non construite. Lance ./run.sh (développement) ou ./run.sh prod.", 503)
    if path and (DIST / path).is_file():
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, "index.html")


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")      # 0.0.0.0 = accessible depuis le réseau local
    if host not in ("127.0.0.1", "localhost") and not os.getenv("APP_PASSWORD"):
        print("ATTENTION : accessible sur le réseau SANS mot de passe (définis APP_PASSWORD dans .env)")
    app.run(host=host, port=int(os.getenv("PORT", "5000")))
