"""Données du graphique : bougies, RSI et repères des trades passés sur la paire affichée."""
from . import kraken
from .indicators import rsi_series

DEFAULT_PAIR, DEFAULT_TF, RSI_PERIOD = "XBTUSDC", 240, 14
TIMEFRAMES = (15, 60, 240, 1440)


def chart(pair, tf, trades):
    """Bougies + RSI(14) de `pair` ; `trades` = historique à repérer sur le graphique (ceux de la fenêtre affichée seulement)."""
    pair, tf = (pair or DEFAULT_PAIR).upper(), int(tf or DEFAULT_TF)
    if tf not in TIMEFRAMES:
        raise ValueError("timeframe invalide")
    rows = kraken.ohlc(pair, tf)
    rsi = rsi_series([r[4] for r in rows], RSI_PERIOD)
    return {
        "pair": pair, "tf": tf,
        "candles": [{"time": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4]} for r in rows],
        "rsi": [{"time": r[0], "value": v} for r, v in zip(rows, rsi) if v is not None],
        "marks": [{"time": t["ts"], "side": t["side"]} for t in trades if t.get("pair") == pair and t.get("ts", 0) >= rows[0][0]],
    }
