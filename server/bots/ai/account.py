"""Construction d'une position du Bot IA, commune au bot et à son backtest."""
import uuid


def make_position(pair, params, price, fields, ts, opened):
    """Dict d'une position ouverte : paramètres contrôlés par `guards.vet_open`, prix d'entrée, champs de quantité et de coût (`positions.open_fields` ou exécution réelle)."""
    return {"id": uuid.uuid4().hex[:8], "pair": pair, "side": params["side"], "leverage": params["leverage"], "strategy": params["strategy"],
            "entry": price, "peak": price, "sl": params["sl"], "tp": params["tp"], "trail": params["trail"],
            "reason": params["reason"], "conf": params["conf"], "ts": ts, "opened": opened, **fields}
