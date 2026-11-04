"""Tableau comparatif des paires surveillées pour une durée de bougie (carte « Marché »)."""
import time

from server.core.cache import memo
from . import kraken
from .indicators import bollinger_pct_b, rsi_last, trend_state
from .pairs import WATCH

SCAN_TTL = 60          # secondes de cache : le scan appelle Kraken une fois par paire
PAUSE = 0.4            # pause entre deux paires, par courtoisie envers l'API publique
RSI_PERIOD = 14
EMA_FAST, EMA_SLOW = 20, 50


def _asset_pair_keys():
    """altname -> clé interne de Kraken, utilisée dans les réponses de Ticker."""
    return memo("asset_pairs", 3600, lambda: {v["altname"]: k for k, v in kraken.public("AssetPairs").items()})


def _row(pair, label, ticker, tf):
    price, open24 = float(ticker["c"][0]), float(ticker["o"])
    candles = kraken.closed_candles(pair, tf)
    recent = candles[-30:]
    closes = [c[4] for c in candles]
    trend = trend_state(closes, EMA_FAST, EMA_SLOW)
    return {
        "pair": pair, "label": label, "price": price, "chg24": (price / open24 - 1) * 100,
        "vol24": float(ticker["v"][1]) * float(ticker["p"][1]),
        "rsi": rsi_last(closes, RSI_PERIOD),
        "trend_gap": trend[0] if trend else None,         # écart EMA20 / EMA50 en % (méthode « tendance »)
        "trend_cross": bool(trend and trend[1]),          # croisement haussier sur la dernière bougie
        "pctb": bollinger_pct_b(closes),                  # %B de Bollinger(20, 2) : < 0 = sous la bande basse
        "volat": sum((c[2] - c[3]) / c[4] for c in recent) / len(recent) * 100,    # amplitude moyenne des 30 dernières bougies, en %
    }


def scan(tf):
    """Une ligne par paire surveillée ; les paires injoignables sont marquées `error`. Mise en cache 60 s."""
    def compute():
        keys = _asset_pair_keys()
        tickers = kraken.public("Ticker", pair=",".join(p for p, _ in WATCH))
        rows = []
        for pair, label in WATCH:
            try:
                rows.append(_row(pair, label, tickers[keys[pair]], tf))
            except Exception:
                rows.append({"pair": pair, "label": label, "error": True})
            time.sleep(PAUSE)
        return rows
    return memo(("scan", tf), SCAN_TTL, compute)
