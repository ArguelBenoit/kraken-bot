"""Indicateurs techniques purs (aucune dépendance au reste du serveur). Une valeur `None` = pas assez de données.

Ces formules sont reproduites à l'identique côté interface (web/src/lib/learn/indicators.ts) pour le tutoriel.
"""


def ema_series(closes, n):
    """EMA de période n, amorcée par la moyenne simple des n premières clôtures."""
    out = [None] * len(closes)
    if len(closes) < n:
        return out
    e = sum(closes[:n]) / n
    out[n - 1] = e
    k = 2 / (n + 1)
    for i in range(n, len(closes)):
        e = closes[i] * k + e * (1 - k)
        out[i] = e
    return out


def rsi_series(closes, n):
    """RSI (lissage de Wilder) pour chaque bougie."""
    out = [None] * len(closes)
    if len(closes) <= n:
        return out
    avg_gain = sum(max(closes[i] - closes[i - 1], 0) for i in range(1, n + 1)) / n
    avg_loss = sum(max(closes[i - 1] - closes[i], 0) for i in range(1, n + 1)) / n
    for i in range(n, len(closes)):
        if i > n:
            d = closes[i] - closes[i - 1]
            avg_gain = (avg_gain * (n - 1) + max(d, 0)) / n
            avg_loss = (avg_loss * (n - 1) + max(-d, 0)) / n
        out[i] = 100.0 if avg_loss == 0 else 100 - 100 / (1 + avg_gain / avg_loss)
    return out


def rsi_last(closes, n):
    """RSI de la dernière bougie (None si pas assez de données)."""
    return (rsi_series(closes, n) or [None])[-1]


def trend_state(closes, fast, slow):
    """(écart en % de l'EMA rapide sur la lente, croisement haussier sur la dernière bougie) ; None si pas assez de données."""
    f, s = ema_series(closes, fast), ema_series(closes, slow)
    if len(closes) < 2 or s[-2] is None or s[-1] is None:
        return None
    return (f[-1] / s[-1] - 1) * 100, f[-2] <= s[-2] and f[-1] > s[-1]


def bollinger_pct_b(closes, n=20, k=2.0):
    """Position du cours dans les bandes de Bollinger (0 = bande basse, 1 = bande haute) ; None si indéterminé."""
    if len(closes) < n:
        return None
    window = closes[-n:]
    mean = sum(window) / n
    sd = (sum((x - mean) ** 2 for x in window) / n) ** 0.5
    return None if sd == 0 else (closes[-1] - (mean - k * sd)) / (2 * k * sd)

