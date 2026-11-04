"""Règles de sortie du bot simple (fonctions pures : testables sans réseau)."""

# Méthodes à objectif fixe (take profit) ; toutes les autres laissent courir la hausse avec un stop suiveur.
FIXED_TARGET = ("rsi", "bollinger")


def stop_reason(cfg, state, price):
    """Texte de sortie si le stop est touché, sinon None.

    Le stop ATR remplace le stop loss en % quand il est actif ET connu pour la position ouverte.
    """
    change = (price / state["entry"] - 1) * 100
    stop_px = state.get("stop_px")
    if cfg["atr_stop"] > 0 and stop_px:
        return f"stop ATR {change:+.2f}%" if price <= stop_px else None
    return f"stop loss {change:+.2f}%" if change <= -cfg["stop_loss_pct"] else None


def exit_reason(cfg, state, price, sig):
    """Pourquoi vendre maintenant (texte pour le journal), ou None. Ordre : stop, objectif / stop suiveur, signal de sortie."""
    change = (price / state["entry"] - 1) * 100
    reason = stop_reason(cfg, state, price)
    if reason:
        return reason
    if cfg["strategy"] in FIXED_TARGET:
        if change >= cfg["take_profit_pct"]:
            return f"take profit {change:+.2f}%"
    elif cfg["trailing_pct"] > 0 and price <= state["peak"] * (1 - cfg["trailing_pct"] / 100):
        return f"stop suiveur −{cfg['trailing_pct']}% depuis le pic ({change:+.2f}%)"
    if sig["sell"]:
        return f"sortie {cfg['strategy']} : {sig['info']} ({change:+.2f}%)"
    return None
