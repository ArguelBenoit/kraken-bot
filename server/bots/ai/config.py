"""Réglages du Bot IA : valeurs par défaut, bornes, modèles Claude, profils d'agressivité et validation."""
from server.core.limits import check_limits
from server.market.pairs import LABELS, WATCH

MODELS = {"claude-haiku-5-5": "Haiku 5.5 (rapide, le moins cher)", "claude-sonnet-5-5": "Sonnet 5.5 (équilibré)",
          "claude-opus-5-5": "Opus 5.5 (plus puissant)", "claude-fable-5-1": "Fable 5.1 (le plus capable)"}

# Stratégies que Claude peut invoquer (noms propres à l'IA) et leur description, injectée dans le prompt.
STRATEGIES = {
    "rsi_reversion": "Mean-reversion RSI : achat d'un creux (RSI bas, prix sous la bande de Bollinger basse), sortie au rebond.",
    "trend_follow": "Suivi de tendance : EMA20 > EMA50 avec écart qui s'élargit ou croisement haussier récent, stop suiveur.",
    "breakout": "Cassure : prix qui dépasse le plus haut des 20 dernières bougies avec volatilité en hausse.",
    "momentum": "Momentum : actif le plus fort sur 6/24 bougies, tant que le RSI n'est pas extrême (>80).",
    "bollinger": "Bollinger : retour vers la moyenne depuis la bande basse (%B < 0.1) quand la tendance de fond n'est pas fortement baissière.",
}

# Garde-fous imposés par le code selon l'agressivité : confiance minimale, taille maximale (× montant de base), stop maximal (%).
PROFILES = {
    "prudent": {"min_conf": 0.75, "size_max": 0.6, "sl_max": 3.0,
                "desc": "très sélectif, n'agit que sur des signaux forts et clairs, préfère ne rien faire, petites positions, stops serrés"},
    "equilibre": {"min_conf": 0.60, "size_max": 1.0, "sl_max": 6.0,
                  "desc": "équilibré, agit sur des signaux solides avec un bon rapport gain/risque"},
    "agressif": {"min_conf": 0.45, "size_max": 1.5, "sl_max": 10.0,
                 "desc": "opportuniste, accepte des signaux plus incertains et des positions plus grosses, stops plus larges"},
}

DEFAULT_CONFIG = {
    "mode": "paper",                 # paper | live
    "model": "claude-sonnet-5-5",
    "timeframe": 60,                 # bougies analysées (minutes) : 15 | 60 | 240 | 1440
    "interval_min": 30,              # minutes entre deux analyses de Claude
    "check_every": 30,               # secondes entre deux contrôles locaux des stops
    "max_positions": 3,              # 1 à 5 trades en parallèle
    "aggressiveness": "equilibre",
    "strategies": list(STRATEGIES),
    "pairs": [p for p, _ in WATCH],
    "order_size": 50.0,              # montant de base par trade (stablecoin)
    "budget": 1000.0,                # capital alloué à l'IA (paper : cash de départ)
    "max_exposure_pct": 60.0,        # % max du budget investi en même temps
    "max_daily_loss_pct": 5.0,       # au-delà, plus aucune nouvelle ouverture jusqu'à demain
    "max_calls_per_day": 100,        # plafond d'appels à l'API Claude par jour
    "fee_pct": 0.26,
    "price_in": 3.0,                 # $ par million de tokens en entrée (à vérifier dans la console Anthropic)
    "price_out": 15.0,               # $ par million de tokens en sortie
    "credit_base": 0.0,              # crédit restant lu dans la console ($) : point de départ de l'estimation
    "notes": "",                     # consignes libres ajoutées au prompt
}
LIMITS = {"timeframe": (15, 1440), "interval_min": (5, 720), "check_every": (10, 600), "max_positions": (1, 5),
          "order_size": (5, 100000), "budget": (10, 10000000), "max_exposure_pct": (5, 100),
          "max_daily_loss_pct": (0.5, 50), "max_calls_per_day": (1, 1000), "fee_pct": (0, 2),
          "price_in": (0, 1000), "price_out": (0, 1000), "credit_base": (0, 1000000)}
FLOAT_KEYS = ("order_size", "budget", "max_exposure_pct", "max_daily_loss_pct", "fee_pct", "price_in", "price_out", "credit_base")
TIMEFRAMES = (15, 60, 240, 1440)


def validate(current, new, busy):
    """Réglage complet issu de `current` + `new`, ou ValueError. `busy` (bot en marche / positions ouvertes) interdit de changer de mode."""
    cfg = dict(current)
    cfg.update({k: v for k, v in (new or {}).items() if k in DEFAULT_CONFIG})
    if cfg["mode"] not in ("paper", "live"):
        raise ValueError("mode invalide")
    if cfg["mode"] != current["mode"] and busy:
        raise ValueError("Changement de mode impossible : arrête le bot IA et ferme les positions")
    if cfg["aggressiveness"] not in PROFILES:
        raise ValueError("agressivité invalide")
    if cfg["model"] not in MODELS:
        raise ValueError("modèle inconnu")
    cfg["notes"] = str(cfg["notes"])[:500]
    for key in LIMITS:
        cfg[key] = float(cfg[key]) if key in FLOAT_KEYS else int(cfg[key])
    check_limits(cfg, LIMITS)
    if cfg["timeframe"] not in TIMEFRAMES:
        raise ValueError("timeframe invalide")
    cfg["strategies"] = [s for s in cfg["strategies"] if s in STRATEGIES]
    cfg["pairs"] = [p for p in cfg["pairs"] if p in LABELS]
    if not cfg["strategies"] or not cfg["pairs"]:
        raise ValueError("Choisis au moins une stratégie et une paire")
    if cfg["order_size"] > cfg["budget"]:
        raise ValueError("Le montant par trade dépasse le budget")
    return cfg
