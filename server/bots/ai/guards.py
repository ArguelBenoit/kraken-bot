"""Garde-fous du Bot IA, appliqués par le code : Le modèle ne peut pas les contourner (fonctions pures)."""
from server.bots import positions as pos
from server.bots.manual_config import MIN_LEVERAGE
from .config import MARGIN_FEE_PCT, PROFILES

MIN_STOP_PCT = 0.5
MIN_SIZE_FACTOR = 0.25
MAX_TP_PCT, MAX_TRAIL_PCT = 100, 50
MAX_SHORT_TP_PCT = 95             # un short ne peut pas gagner plus de 100 % : l'objectif reste en dessous
SHORT_CONF_BONUS = 0.1            # un short exige plus de confiance que l'achat du même profil (risque non plafonné)


def too_low_ratio(cfg, take_profit, stop):
    """Le rapport gain/risque (TP ÷ SL) est-il sous le minimum réglé ? Sans minimum (None) ou sans objectif, jamais."""
    return cfg["min_reward_risk"] is not None and take_profit > 0 and take_profit / stop < cfg["min_reward_risk"]


def vet_open(cfg, state, action):
    """Contrôle une ouverture proposée (achat ou short). Renvoie (paramètres sûrs, None), ou (None, motif de refus)."""
    profile = PROFILES[cfg["aggressiveness"]]
    pair, strategy = action.get("pair"), action.get("strategy")
    confidence = float(action.get("confidence", 0))
    side = action.get("side") or "long"
    if side not in ("long", "short"):
        return None, "sens invalide"
    short = side == "short"
    if short and not cfg["allow_short"]:
        return None, "short désactivé dans les réglages"
    if pair not in cfg["pairs"]:
        return None, "paire non autorisée"
    if strategy not in cfg["strategies"]:
        return None, "stratégie non autorisée"
    if any(p["pair"] == pair for p in state["positions"]):
        return None, "position déjà ouverte"
    if len(state["positions"]) >= cfg["max_positions"]:
        return None, "nombre max de positions atteint"
    min_conf = min(profile["min_conf"] + (SHORT_CONF_BONUS if short else 0), 0.95)
    if confidence < min_conf:
        return None, f"confiance {confidence:.2f} < minimum {min_conf:.2f} ({cfg['aggressiveness']}{', short' if short else ''})"
    if cfg["max_daily_loss_pct"] is not None and state["day_pnl"] <= -cfg["budget"] * cfg["max_daily_loss_pct"] / 100:
        return None, "perte journalière max atteinte"
    stop = float(action.get("stop_loss_pct") or 0)
    if stop <= 0:
        return None, "stop loss obligatoire"
    stop = min(max(stop, MIN_STOP_PCT), profile["sl_max"])
    leverage = 1.0
    if short:
        leverage = min(max(float(action.get("leverage") or MIN_LEVERAGE), MIN_LEVERAGE), cfg["max_leverage"])
        if stop >= pos.liq_distance_pct(leverage):
            return None, f"stop loss {stop:g} % trop large : à ×{leverage:g} la liquidation estimée est à +{pos.liq_distance_pct(leverage):.1f} %"
    take_profit = min(float(action.get("take_profit_pct") or 0), MAX_SHORT_TP_PCT if short else MAX_TP_PCT)
    if take_profit and too_low_ratio(cfg, take_profit, stop):
        return None, f"gain/risque {take_profit / stop:.2f} < minimum {cfg['min_reward_risk']:g} (TP {take_profit:g} % / SL {stop:g} %)"
    factor = min(max(float(action.get("size_factor", 1)), MIN_SIZE_FACTOR), profile["size_max"])
    size = cfg["order_size"] * factor                       # long : montant dépensé ; short : montant vendu (la garantie en est une fraction)
    invested = sum(p["size"] if pos.is_short(p) else p["cost"] for p in state["positions"])
    if cfg["max_exposure_pct"] is not None and invested + size > cfg["budget"] * cfg["max_exposure_pct"] / 100:
        return None, "exposition max atteinte"
    needed = size
    if short:
        terms = pos.open_short(size, 1.0, leverage, cfg["fee_pct"], MARGIN_FEE_PCT)
        needed = terms["collateral"] + terms["open_fees"]
    if cfg["mode"] == "paper" and state["cash"] < needed:
        return None, "solde insuffisant"
    return {"size": size, "side": side, "leverage": leverage, "strategy": strategy, "sl": stop, "conf": confidence,
            "tp": take_profit,
            "trail": min(float(action.get("trailing_pct") or 0), MAX_TRAIL_PCT),
            "reason": str(action.get("reason", ""))[:200]}, None


def adjust(cfg, position, action):
    """Applique à `position` les nouveaux niveaux proposés, bornés par le profil. Renvoie les refus (liste de textes, vide si tout est passé).

    Un stop (loss ou suiveur) ne s'éloigne JAMAIS : il ne peut que se rapprocher du prix d'entrée / du plus haut, ou rester ; il ne peut ni être supprimé,
    ni élargi. L'objectif (TP) n'est pas un risque : il se règle librement."""
    stop_max = PROFILES[cfg["aggressiveness"]]["sl_max"]
    if pos.is_short(position):                              # un stop de short reste toujours sous la liquidation
        stop_max = min(stop_max, pos.liq_distance_pct(position["leverage"]) - MIN_STOP_PCT)
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
        target = min(max(float(action["take_profit_pct"]), 0), MAX_SHORT_TP_PCT if pos.is_short(position) else MAX_TP_PCT)
        if target and too_low_ratio(cfg, target, position["sl"]):
            refused.append(f"objectif conservé à {position['tp']} % (gain/risque {target / position['sl']:.2f} < minimum {cfg['min_reward_risk']:g})")
        else:
            position["tp"] = target
    if not position["sl"]:
        position["sl"] = stop_max                           # position sans stop (ancien état) : on en impose un
    return refused
