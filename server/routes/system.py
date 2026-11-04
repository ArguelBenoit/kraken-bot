"""Routes transverses : activité des bots (pastilles du menu) et variables d'environnement définies (bas du menu)."""
from flask import Blueprint, jsonify

from server import settings
from server.market.prices import try_last_price
from server.services import ai, bot, manual

bp = Blueprint("system", __name__, url_prefix="/api")


def _tally(positions):
    """[(paire, prix d'entrée)] -> nombre de positions en gain / en perte au prix actuel (prix indisponible : ignoré)."""
    gain = loss = 0
    for pair, entry in positions:
        price = try_last_price(pair)
        if price is None or not entry:
            continue
        gain += price > entry
        loss += price < entry
    return {"gain": int(gain), "loss": int(loss)}


@bp.get("/activity")
def activity():
    """Pour chaque bot : tourne-t-il ? combien de positions ouvertes, et combien sont en gain / en perte."""
    bot_positions = [(bot.position_pair, bot.state.get("entry"))] if bot.has_position else []
    ai_positions = [(p["pair"], p["entry"]) for p in list(ai.state["positions"])]
    manual_positions = [(p["pair"], p["entry"]) for p in list(manual.state["positions"])]
    return jsonify(
        bot={"running": bot.running, "positions": len(bot_positions), **_tally(bot_positions)},
        ai={"running": ai.running, "positions": len(ai_positions), **_tally(ai_positions)},
        manual={"positions": len(manual_positions), "pending": len(manual.state["pending"]), **_tally(manual_positions)},
    )


@bp.get("/connections")
def connections():
    """Variables d'environnement définies ou non : seulement un booléen par variable, jamais sa valeur."""
    var = lambda name: {"name": name, "set": settings.is_set(name)}
    return jsonify(claude=[var("ANTHROPIC_API_KEY")], kraken=[var("KRAKEN_API_KEY"), var("KRAKEN_API_SECRET")])
