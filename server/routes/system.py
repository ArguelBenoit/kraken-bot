"""Routes transverses : activité des bots (pastilles du menu) et variables d'environnement définies (bas du menu)."""
from flask import Blueprint, jsonify

from server import settings
from server.core.llm import LlmError, list_models
from server.core.providers import PROVIDERS
from server.market.prices import try_last_price
from server.services import ai, manual

bp = Blueprint("system", __name__, url_prefix="/api")


def _tally(positions):
    """[(paire, prix d'entrée, short ?)] -> nombre de positions en gain / en perte au prix actuel (prix indisponible : ignoré)."""
    gain = loss = 0
    for pair, entry, short in positions:
        price = try_last_price(pair)
        if price is None or not entry:
            continue
        move = (entry - price) if short else (price - entry)
        gain += move > 0
        loss += move < 0
    return {"gain": int(gain), "loss": int(loss)}


@bp.get("/activity")
def activity():
    """Bot IA (tourne ? positions) et trading manuel (positions, ordres en attente) : combien sont en gain / en perte."""
    ai_positions = [(p["pair"], p["entry"], False) for p in list(ai.state["positions"])]
    manual_positions = [(p["pair"], p["entry"], p.get("side") == "short") for p in list(manual.state["positions"])]
    return jsonify(
        ai={"running": ai.running, "positions": len(ai_positions), **_tally(ai_positions)},
        manual={"positions": len(manual_positions), "pending": len(manual.state["pending"]), **_tally(manual_positions)},
    )


@bp.get("/connections")
def connections():
    """Variables d'environnement définies ou non : seulement un booléen par variable, jamais sa valeur."""
    var = lambda name: {"name": name, "set": settings.is_set(name)}
    return jsonify(models=[var(p["env"]) for p in PROVIDERS.values()], kraken=[var("KRAKEN_API_KEY"), var("KRAKEN_API_SECRET")])


@bp.get("/models/<provider>")
def models(provider):
    """Modèles disponibles chez un fournisseur (liste officielle via sa clé). Sans clé ou en cas d'échec : modèles d'exemple + `notice`."""
    if provider not in PROVIDERS:
        return jsonify(ok=False, error="fournisseur inconnu"), 404
    try:
        return jsonify(ok=True, models=list_models(provider), source="api")
    except LlmError as e:
        return jsonify(ok=True, models=PROVIDERS[provider]["models"], source="examples", notice=str(e))
