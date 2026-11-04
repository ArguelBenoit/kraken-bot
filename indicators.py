"""Indicateurs purs (sans dépendance au bot)."""

def ema_series(closes, n):
    """EMA de période n ; None tant que n bougies ne sont pas disponibles (amorcée par la moyenne simple)."""
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
    """RSI (lissage de Wilder) pour chaque bougie ; None tant que les données manquent."""
    out = [None] * len(closes)
    if len(closes) <= n:
        return out
    ag = sum(max(closes[i] - closes[i-1], 0) for i in range(1, n + 1)) / n
    al = sum(max(closes[i-1] - closes[i], 0) for i in range(1, n + 1)) / n
    for i in range(n, len(closes)):
        if i > n:
            d = closes[i] - closes[i-1]
            ag = (ag * (n - 1) + max(d, 0)) / n
            al = (al * (n - 1) + max(-d, 0)) / n
        out[i] = 100.0 if al == 0 else 100 - 100 / (1 + ag / al)
    return out
