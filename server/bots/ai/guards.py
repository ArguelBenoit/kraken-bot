"""Garde-fous du Bot IA, appliqués par le code : Le modèle ne peut pas les contourner (fonctions pures)."""
from .config import PROFILES

MIN_STOP_PCT = 0.5
MIN_SIZE_FACTOR = 0.25
MAX_TP_PCT, MAX_TRAIL_PCT = 100, 50


def too_low_ratio(cfg, take_profit, stop):
    """Le rapport gain/risque (TP ÷ SL) est-il sous le minimum réglé ? Sans minimum (None) ou sans objectif, jamais."""
    return cfg["min_reward_risk"] is not None and take_profit > 0 and take_profit / stop < cfg["min_reward_risk"]


def vet_open(cfg, state, action):
    """Contrôle une ouverture proposée. Renvoie (paramètres sûrs, None), ou (None, motif de refus)."""
    profile = PROFILES[cfg["aggressiveness"]]
    pair, strategy = action.get("pair"), action.get("strategy")
    confidence = float(action.get("confidence", 0))
    if pair not in cfg["pairs"]:
        return None, "paire non autorisée"
    if strategy not in cfg["strategies"]:
        return None, "stratégie non autorisée"
    if any(p["pair"] == pair for p in state["positions"]):
        return None, "position déjà ouverte"
    if len(state["positions"]) >= cfg["max_positions"]:
        return None, "nombre max de positions atteint"
    if confidence < profile["min_conf"]:
        return None, f"confiance {confidence:.2f} < minimum {profile['min_conf']} ({cfg['aggressiveness']})"
    if cfg["max_daily_loss_pct"] is not None and state["day_pnl"] <= -cfg["budget"] * cfg["max_daily_loss_pct"] / 100:
        return None, "perte journalière max atteinte"
    stop = float(action.get("stop_loss_pct") or 0)
    if stop <= 0:
        return None, "stop loss obligatoire"
    stop = min(max(stop, MIN_STOP_PCT), profile["sl_max"])
    take_profit = min(float(action.get("take_profit_pct") or 0), MAX_TP_PCT)
    if take_profit and too_low_ratio(cfg, take_profit, stop):
        return None, f"gain/risque {take_profit / stop:.2f} < minimum {cfg['min_reward_risk']:g} (TP {take_profit:g} % / SL {stop:g} %)"
    factor = min(max(float(action.get("size_factor", 1)), MIN_SIZE_FACTOR), profile["size_max"])
    size = cfg["order_size"] * factor
    invested = sum(p["cost"] for p in state["positions"])
    if cfg["max_exposure_pct"] is not None and invested + size > cfg["budget"] * cfg["max_exposure_pct"] / 100:
        return None, "exposition max atteinte"
    if cfg["mode"] == "paper" and state["cash"] < size:
        return None, "solde insuffisant"
    return {"size": size, "strategy": strategy, "sl": stop, "conf": confidence,
            "tp": take_profit,
            "trail": min(float(action.get("trailing_pct") or 0), MAX_TRAIL_PCT),
            "reason": str(action.get("reason", ""))[:200]}, None


def adjust(cfg, position, action):
    """Applique à `position` les nouveaux niveaux proposés, bornés par le profil. Renvoie les refus (liste de textes, vide si tout est passé).

    Un stop (loss ou suiveur) ne s'éloigne JAMAIS : il ne peut que se rapprocher du prix d'entrée / du plus haut, ou rester ; il ne peut ni être supprimé,
    ni élargi. L'objectif (TP) n'est pas un risque : il se règle librement."""
    stop_max = PROFILES[cfg["aggressiveness"]]["sl_max"]
    refused = []
    for key, field, label in (("sl", "stop_loss_pct", "stop loss"), ("trail", "trailing_pct", "stop suiveur")):
        if action.get(field) is None:
            continue
        new, old = min(max(float(action[field]), 0), stop_max), position.get(key) or 0
        if key == "sl" and new > 0:
            new = max(new, MIN_STOP_PCT)                    # pas de stop microscopique ; 0 = « supprimer » est refusé plus bas
        if old and (new == 0 or new > old):
            refused.append(f"{label} conservé à {old} % (un stop ne s'éloigne jamais)")
        else:
            position[key] = new
    if action.get("take_profit_pct") is not None:
        target = min(max(float(action["take_profit_pct"]), 0), MAX_TP_PCT)
        if target and too_low_ratio(cfg, target, position["sl"]):
            refused.append(f"objectif conservé à {position['tp']} % (gain/risque {target / position['sl']:.2f} < minimum {cfg['min_reward_risk']:g})")
        else:
            position["tp"] = target
    if not position["sl"]:
        position["sl"] = stop_max                           # position sans stop (ancien état) : on en impose un
    return refused
