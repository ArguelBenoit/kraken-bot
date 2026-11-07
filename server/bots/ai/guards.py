"""Garde-fous du Bot IA, appliqués par le code : Le modèle ne peut pas les contourner (fonctions pures)."""
from .config import PROFILES

MIN_STOP_PCT = 0.5
MIN_SIZE_FACTOR = 0.25
MAX_TP_PCT, MAX_TRAIL_PCT = 100, 50


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
    factor = min(max(float(action.get("size_factor", 1)), MIN_SIZE_FACTOR), profile["size_max"])
    size = cfg["order_size"] * factor
    invested = sum(p["cost"] for p in state["positions"])
    if cfg["max_exposure_pct"] is not None and invested + size > cfg["budget"] * cfg["max_exposure_pct"] / 100:
        return None, "exposition max atteinte"
    if cfg["mode"] == "paper" and state["cash"] < size:
        return None, "solde insuffisant"
    return {"size": size, "strategy": strategy, "sl": stop, "conf": confidence,
            "tp": min(float(action.get("take_profit_pct") or 0), MAX_TP_PCT),
            "trail": min(float(action.get("trailing_pct") or 0), MAX_TRAIL_PCT),
            "reason": str(action.get("reason", ""))[:200]}, None


def adjust(cfg, position, action):
    """Applique à `position` les nouveaux stop / objectif / suiveur proposés, bornés par le profil ; le stop reste toujours défini."""
    stop_max = PROFILES[cfg["aggressiveness"]]["sl_max"]
    for key, field, ceiling in (("sl", "stop_loss_pct", stop_max), ("tp", "take_profit_pct", MAX_TP_PCT), ("trail", "trailing_pct", stop_max)):
        if action.get(field) is not None:
            position[key] = min(max(float(action[field]), 0), ceiling)
    if not position["sl"]:
        position["sl"] = stop_max
