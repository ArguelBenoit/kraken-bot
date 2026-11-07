"""Réglages du trading manuel : valeurs par défaut, bornes, validation et lecture des nombres saisis."""
import re

from server.core.providers import DEFAULT_MODEL, DEFAULT_PROVIDER, check_choice

DEFAULT_CONFIG = {
    "mode": "paper",          # paper | live
    "fee_pct": 0.26,          # frais taker Kraken (estimation)
    "paper_balance": 1000.0,  # cash de départ en paper (pris en compte au reset)
    "check_every": 10,        # secondes entre deux contrôles des stops / ordres limites
    "max_order": 500.0,       # garde-fou : montant maximum d'un ordre (stablecoin)
    "max_leverage": 3.0,      # levier maximum d'un short (2 à 5)
    "margin_fee_pct": 0.02,   # frais d'ouverture d'une position en marge (estimation)
    "rollover_pct": 0.02,     # frais de report d'une position en marge, par période de 4 h (estimation)
    "provider": DEFAULT_PROVIDER,  # modèle des propositions de trade (voir core/providers.py)
    "model": DEFAULT_MODEL,
    "allow_live_short": False,  # autorise les shorts en LIVE (marge Kraken jamais validée : à activer en connaissance de cause)
}
LIMITS = {"fee_pct": (0, 2), "paper_balance": (10, 10_000_000), "check_every": (5, 300), "max_order": (5, 1_000_000),
          "max_leverage": (2, 5), "margin_fee_pct": (0, 1), "rollover_pct": (0, 1)}
MIN_ORDER = 5.0
MIN_LEVERAGE = 2.0
PAIR_RE = re.compile(r"^[A-Z0-9]{5,12}$")


def num(d, key, default=0.0, lo=0.0, hi=None, name=None):
    try:
        v = float(d.get(key) if d.get(key) not in (None, "") else default)
    except (TypeError, ValueError):
        raise ValueError(f"{name or key} invalide")
    if v < lo or (hi is not None and v > hi):
        raise ValueError(f"{name or key} doit être entre {lo:g} et {hi:g}" if hi is not None else f"{name or key} doit être ≥ {lo:g}")
    return v


def validate(current, new, busy):
    """Réglage complet issu de `current` + `new`, ou ValueError. `busy` (positions ou ordres en attente) interdit de changer de mode."""
    c = dict(current)
    for k in DEFAULT_CONFIG:
        if k in (new or {}):
            c[k] = new[k]
    if c["mode"] not in ("paper", "live"):
        raise ValueError("mode invalide")
    if c["mode"] != current["mode"] and busy:
        raise ValueError("Changement de mode impossible : ferme les positions et annule les ordres en attente")
    c["model"] = check_choice(c["provider"], c["model"])
    c["allow_live_short"] = bool(c["allow_live_short"])
    for k, (lo, hi) in LIMITS.items():
        c[k] = int(c[k]) if k == "check_every" else float(c[k])
        if not lo <= c[k] <= hi:
            raise ValueError(f"{k} doit être entre {lo} et {hi}")
    return c
