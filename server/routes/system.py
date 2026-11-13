"""Routes transverses : activité des bots (pastilles du menu) et variables d'environnement définies (bas du menu)."""
from flask import Blueprint, jsonify

from server import settings
from server.core.transport import LlmError
from server.core.models import list_models
from server.core.providers import PROVIDERS, connected
from server.market.prices import try_last_price
from server.services import ai, backtest, manual

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
    """Bot IA (tourne ? positions), backtest (en cours ?) et trading manuel (positions, ordres en attente) : combien sont en gain / en perte."""
    ai_positions = [(p["pair"], p["entry"], False) for p in list(ai.state["positions"])]
    manual_positions = [(p["pair"], p["entry"], p.get("side") == "short") for p in list(manual.state["positions"])]
    return jsonify(
        ai={"running": ai.running, "positions": len(ai_positions), **_tally(ai_positions)},
        backtest={"running": backtest.running(), "paused": backtest.paused()},
        manual={"positions": len(manual_positions), "pending": len(manual.state["pending"]), **_tally(manual_positions)},
    )


@bp.get("/connections")
def connections():
    """Variables d'environnement définies ou non (jamais leur valeur) et état d'Ollama (serveur actif ? modèles installés)."""
    var = lambda name: {"name": name, "set": settings.is_set(name)}
    try:
        ollama = {"up": True, "models": list_models("ollama")}
    except LlmError:      # serveur éteint, ou aucun modèle installé
        ollama = {"up": connected("ollama"), "models": []}
    return jsonify(models=[var(p["env"]) for p in PROVIDERS.values() if not p.get("keyless")], kraken=[var("KRAKEN_API_KEY"), var("KRAKEN_API_SECRET")],
                   ollama=ollama)


@bp.get("/models/<provider>")
def models(provider):
    """Modèles disponibles chez un fournisseur (liste officielle via sa clé). Sans clé ou en cas d'échec : modèles d'exemple + `notice`."""
    if provider not in PROVIDERS:
        return jsonify(ok=False, error="fournisseur inconnu"), 404
    try:
        return jsonify(ok=True, models=list_models(provider), source="api")
    except LlmError as e:
        return jsonify(ok=True, models=PROVIDERS[provider]["models"], source="examples", notice=str(e))
