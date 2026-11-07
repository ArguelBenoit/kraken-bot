"""Réglages du Bot IA : valeurs par défaut, bornes, profils d'agressivité et validation."""
from server.core.limits import check_limits
from server.core.providers import DEFAULT_MODEL, DEFAULT_PROVIDER, check_choice
from server.market.pairs import LABELS, WATCH

# Stratégies que le modèle peut invoquer (noms propres à l'IA) et leur description, injectée dans le prompt.
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
    "provider": DEFAULT_PROVIDER,    # fournisseur du modèle (voir core/providers.py)
    "model": DEFAULT_MODEL,
    "timeframe": 60,                 # bougies analysées (minutes) : 15 | 60 | 240 | 1440
    "interval_min": 30,              # minutes entre deux analyses du modèle
    "check_every": 30,               # secondes entre deux contrôles locaux des stops
    "max_positions": 3,              # 1 à 5 trades en parallèle
    "aggressiveness": "equilibre",
    "strategies": list(STRATEGIES),
    "pairs": [p for p, _ in WATCH],
    "order_size": 50.0,              # montant de base par trade (stablecoin)
    "budget": 1000.0,                # capital alloué à l'IA (paper : cash de départ)
    "max_exposure_pct": 60.0,        # % max du budget investi en même temps (None = illimité)
    "max_daily_loss_pct": 5.0,       # au-delà, plus aucune nouvelle ouverture jusqu'à demain (None = illimité)
    "max_calls_per_day": 100,        # plafond d'appels au modèle par jour (None = illimité, ex. modèle local)
    "fee_pct": 0.26,                 # frais par ordre (vide = 0)
    "notes": "",                     # consignes libres ajoutées au prompt
}
LIMITS = {"timeframe": (15, 1440), "interval_min": (5, 720), "check_every": (10, 600), "max_positions": (1, 5),
          "order_size": (5, 100000), "budget": (10, 10000000), "max_exposure_pct": (5, 100),
          "max_daily_loss_pct": (0.5, 50), "max_calls_per_day": (1, 100000), "fee_pct": (0, 2)}
FLOAT_KEYS = ("order_size", "budget", "max_exposure_pct", "max_daily_loss_pct", "fee_pct")
OPTIONAL_KEYS = ("max_exposure_pct", "max_daily_loss_pct", "max_calls_per_day")      # champ vide = aucune restriction (None)
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
    cfg["model"] = check_choice(cfg["provider"], cfg["model"])
    cfg["notes"] = str(cfg["notes"])[:500]
    for key in OPTIONAL_KEYS:
        if cfg[key] in (None, ""):
            cfg[key] = None
    if cfg["fee_pct"] in (None, ""):
        cfg["fee_pct"] = 0.0
    for key in LIMITS:
        if cfg[key] is not None:
            cfg[key] = float(cfg[key]) if key in FLOAT_KEYS else int(cfg[key])
    check_limits({k: v for k, v in cfg.items() if v is not None}, {k: r for k, r in LIMITS.items() if cfg[k] is not None})
    if cfg["timeframe"] not in TIMEFRAMES:
        raise ValueError("timeframe invalide")
    cfg["strategies"] = [s for s in cfg["strategies"] if s in STRATEGIES]
    cfg["pairs"] = [p for p in cfg["pairs"] if p in LABELS]
    if not cfg["strategies"] or not cfg["pairs"]:
        raise ValueError("Choisis au moins une stratégie et une paire")
    if cfg["order_size"] > cfg["budget"]:
        raise ValueError("Le montant par trade dépasse le budget")
    return cfg
