"""Bougies historiques du backtest du Bot IA : API publique de Kraken, 720 bougies terminées au maximum par durée."""
import time

from server.core.cache import memo
from server.market import kraken
from server.market.snapshot import PAUSE

MAX_CANDLES = 720
WARMUP = 60                 # bougies nécessaires avant la première analyse (EMA 50, rendements sur 24 bougies)


def max_days(tf):
    """Durée maximale testable (jours) avec des bougies de `tf` minutes : les 720 bougies disponibles moins l'échauffement."""
    return (MAX_CANDLES - WARMUP) * tf / 1440


def _fetch(pair, tf):
    rows = kraken.closed_candles(pair, tf)
    time.sleep(PAUSE)           # API publique : une pause entre deux paires
    return rows


def load(pairs, tf):
    """{paire: bougies terminées (temps, o, h, b, c)}, réduites aux instants communs à toutes les paires ; mémorisées 10 min."""
    rows = {pair: memo(f"backtest:{pair}:{tf}", 600, lambda p=pair: _fetch(p, tf)) for pair in pairs}
    common = set.intersection(*({c[0] for c in series} for series in rows.values()))
    return {pair: [c for c in series if c[0] in common] for pair, series in rows.items()}
