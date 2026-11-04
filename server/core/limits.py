"""Contrôle de bornes commun aux réglages des bots."""


def check_limits(cfg, limits):
    """Vérifie que chaque réglage de `limits` ({clé: (min, max)}) est dans sa plage ; lève ValueError sinon."""
    for key, (lo, hi) in limits.items():
        if not lo <= cfg[key] <= hi:
            raise ValueError(f"{key} doit être entre {lo} et {hi}")
