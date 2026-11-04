"""Résumé chiffré du marché envoyé à Claude (Bot IA et propositions de trade) : uniquement des nombres, jamais de texte libre."""
import time

from . import kraken
from .indicators import bollinger_pct_b, ema_series, rsi_last

PAUSE = 0.35      # pause entre deux paires (API publique)


def _round(value, digits):
    return None if value is None else round(value, digits)


def _pair_snapshot(pair, tf):
    ticker = next(iter(kraken.public("Ticker", pair=pair).values()))
    price, open24 = float(ticker["c"][0]), float(ticker["o"])
    candles = kraken.ohlc(pair, tf)[:-1]
    cl = [c[4] for c in candles]
    highs, lows = [c[2] for c in candles], [c[3] for c in candles]
    fast, slow = ema_series(cl, 20), ema_series(cl, 50)
    gap = (fast[-1] / slow[-1] - 1) * 100 if fast[-1] and slow[-1] else None
    prev_gap = (fast[-2] / slow[-2] - 1) * 100 if len(cl) > 2 and fast[-2] and slow[-2] else None
    recent = candles[-30:]
    return {
        "pair": pair, "price": price, "chg24h_pct": round((price / open24 - 1) * 100, 2),
        "rsi14": _round(rsi_last(cl, 14), 1),
        "ema20_vs_ema50_pct": _round(gap, 2), "ema_gap_prev_pct": _round(prev_gap, 2),
        "bollinger_pctB": _round(bollinger_pct_b(cl), 2),
        "vs_20bar_high_pct": round((price / max(highs[-20:]) - 1) * 100, 2),
        "vs_20bar_low_pct": round((price / min(lows[-20:]) - 1) * 100, 2),
        "ret_6bars_pct": round((cl[-1] / cl[-7] - 1) * 100, 2) if len(cl) > 7 else None,
        "ret_24bars_pct": round((cl[-1] / cl[-25] - 1) * 100, 2) if len(cl) > 25 else None,
        "avg_range_pct": round(sum((c[2] - c[3]) / c[4] for c in recent) / len(recent) * 100, 2),
    }


def market_snapshot(tf, pairs):
    """Indicateurs condensés par paire ; une paire en échec donne {"pair", "error"}."""
    rows = []
    for pair in pairs:
        try:
            rows.append(_pair_snapshot(pair, tf))
        except Exception as e:
            rows.append({"pair": pair, "error": str(e)[:60]})
        time.sleep(PAUSE)
    return rows
