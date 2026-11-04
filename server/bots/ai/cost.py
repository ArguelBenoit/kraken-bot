"""Estimation du coût Claude du Bot IA d'après les tokens comptés (l'API Anthropic ne donne pas le solde du compte)."""


def _spend(tokens_in, tokens_out, cfg):
    return (tokens_in * cfg["price_in"] + tokens_out * cfg["price_out"]) / 1e6


def spent_total(usage, cfg):
    """Dépense cumulée estimée en $ (tokens cumulés × prix réglés)."""
    return _spend(usage.get("tin", 0), usage.get("tout", 0), cfg)


def summary(state, cfg):
    """{total, today, left, low} : dépenses estimées, crédit restant estimé (None si non renseigné) et alerte crédit épuisé."""
    usage = state["usage"]
    total = spent_total(usage, cfg)
    left = cfg["credit_base"] - (total - state.get("credit_ref", 0.0)) if cfg["credit_base"] > 0 else None
    return {"total": total, "today": _spend(usage["in"], usage["out"], cfg), "left": left, "low": bool(state.get("credit_low"))}
