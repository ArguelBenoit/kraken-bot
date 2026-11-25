"""État du marché : variation médiane des paires suivies sur 14 jours, classée comme les marchés du backtest (hausse, baisse, sans tendance)."""
import statistics

from server.core.cache import memo_or_stale
from . import kraken
from .pairs import WATCH

BTC = "XBTUSDC"
DAYS, LONG_DAYS = 14, 30
THRESHOLD_PCT = 10          # entre les marchés « sans tendance » du backtest (14 j : |±5 %| max) et les marchés de tendance (|±17 %| min)
TTL = 600


def _change_pct(closes, days):
    """Variation (%) de la dernière clôture par rapport à celle d'il y a `days` jours."""
    return (closes[-1] / closes[-1 - days] - 1) * 100


def _changes():
    """{paire: (variation sur 14 j, variation sur 30 j)} des paires suivies ; une paire sans historique suffisant ou injoignable est ignorée."""
    out = {}
    for pair, _ in WATCH:
        try:
            closes = [c[4] for c in kraken.closed_candles(pair, 1440)]
            out[pair] = (_change_pct(closes, DAYS), _change_pct(closes, LONG_DAYS))
        except (RuntimeError, IndexError, KeyError, ValueError, OSError):
            continue
    return out


def _compute():
    changes = _changes()
    if not changes:
        raise RuntimeError("aucune paire disponible")
    median = statistics.median(c[0] for c in changes.values())
    trend = "hausse" if median >= THRESHOLD_PCT else "baisse" if median <= -THRESHOLD_PCT else "range"
    agree = sum(1 for c in changes.values() if (c[0] > 0) == (median > 0))
    return {"trend": trend, "change_pct": round(median, 1), "long_change_pct": round(statistics.median(c[1] for c in changes.values()), 1),
            "btc_change_pct": round(changes[BTC][0], 1) if BTC in changes else None, "pairs": len(changes), "agree": agree,
            "days": DAYS, "long_days": LONG_DAYS, "threshold_pct": THRESHOLD_PCT}


def regime():
    """Tendance actuelle du marché (médiane des paires suivies sur 14 jours) ; en cache 10 min, dernière valeur connue si Kraken ne répond pas ; None sans aucune valeur."""
    return memo_or_stale("regime", TTL, _compute)
