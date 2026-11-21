"""Préréglages du formulaire (Bot IA et backtest) : un jeu de réglages par type de marché. Ils préremplissent le formulaire, sans rien enregistrer.

Ne touchent ni au modèle, ni au budget, au montant par trade, aux frais ou aux paires (réglages personnels)."""

# Réglages du Bot IA tels qu'enregistrés quand les préréglages ont été créés : valables pour un marché en hausse comme en baisse.
_TENDANCE = {
    "timeframe": 240, "interval_min": 10, "max_positions": 6, "aggressiveness": "equilibre",
    "strategies": ["breakout", "momentum", "rsi_reversion", "trend_follow", "bollinger"],
    "allow_short": True, "max_leverage": 2.0, "min_reward_risk": 1.5,
    "trend_filter": True, "max_same_side": 3, "max_drawdown_pct": 4.0, "drawdown_days": 2, "temperature": 0.2,
}

# Sans tendance : bougies d'1 h, peu de positions corrélées, stratégies de retour à la moyenne ; pas de filtre de tendance
# (il refuserait justement les achats de creux de ces stratégies).
_RANGE = {
    "timeframe": 60, "interval_min": 30, "max_positions": 4, "aggressiveness": "equilibre",
    "strategies": ["rsi_reversion", "bollinger"],
    "allow_short": True, "max_leverage": 2.0, "min_reward_risk": 1.5,
    "trend_filter": False, "max_same_side": 2, "max_drawdown_pct": 4.0, "drawdown_days": 2, "temperature": 0.2,
}

PRESETS = [
    {"id": "hausse", "label": "Marché en hausse", "values": _TENDANCE},
    {"id": "baisse", "label": "Marché en baisse", "values": _TENDANCE},
    {"id": "range", "label": "Sans tendance", "values": _RANGE},
]
