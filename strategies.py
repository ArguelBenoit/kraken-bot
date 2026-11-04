"""Signaux des méthodes « bougies closes » : une seule implémentation partagée par le bot, le scan du marché et le backtest.

`signal(strategy, rows, cfg)` reçoit les bougies CLOSES [(t, o, h, l, c), ...] (la dernière = la plus récente) et renvoie
{"buy": bool, "sell": bool, "info": str} pour cette dernière bougie. `buy` = condition d'entrée, `sell` = condition de sortie.
"""
from indicators import ema_series, rsi_series

NEW = ("bollinger", "donchian", "macd", "momentum")     # méthodes ajoutées à rsi / trend
NEED = {"bollinger": lambda c: c["bb_period"] + 1, "donchian": lambda c: max(c["dc_entry"], c["dc_exit"]) + 2,
        "macd": lambda c: c["macd_slow"] + c["macd_signal"] + 2, "momentum": lambda c: c["mom_period"] + 2}


def atr(rows, n=14):
    """Average True Range sur les n dernières bougies (None si pas assez de données)."""
    if len(rows) < n + 1:
        return None
    tr = [max(r[2] - r[3], abs(r[2] - p[4]), abs(r[3] - p[4])) for p, r in zip(rows[-n - 1:-1], rows[-n:])]
    return sum(tr) / n


def trend_ok(rows, ema_n):
    """Filtre de tendance : dernier cours au-dessus de l'EMA(ema_n). None si pas assez de données."""
    e = ema_series([r[4] for r in rows], ema_n)[-1] if len(rows) >= ema_n else None
    return None if e is None else rows[-1][4] > e


def signal(strategy, rows, cfg):
    if len(rows) < NEED[strategy](cfg):
        return {"buy": False, "sell": False, "info": "données insuffisantes"}
    cl = [r[4] for r in rows]
    price = cl[-1]
    if strategy == "bollinger":
        n = cfg["bb_period"]
        w = cl[-n:]
        mid = sum(w) / n
        sd = (sum((x - mid) ** 2 for x in w) / n) ** 0.5
        low = mid - cfg["bb_std"] * sd
        pb = (price - low) / (2 * cfg["bb_std"] * sd) if sd else 0.5
        return {"buy": price < low, "sell": price >= mid, "info": f"%B {pb:.2f}"}
    if strategy == "donchian":
        hi = max(r[2] for r in rows[-1 - cfg["dc_entry"]:-1])
        lo = min(r[3] for r in rows[-1 - cfg["dc_exit"]:-1])
        return {"buy": price > hi, "sell": price < lo, "info": f"{(price / hi - 1) * 100:+.2f}% du plus haut {cfg['dc_entry']}"}
    if strategy == "macd":
        f, s = ema_series(cl, cfg["macd_fast"]), ema_series(cl, cfg["macd_slow"])
        macd = [a - b for a, b in zip(f, s) if a is not None and b is not None]
        sig = ema_series(macd, cfg["macd_signal"])
        if len(macd) < 2 or sig[-2] is None:
            return {"buy": False, "sell": False, "info": "données insuffisantes"}
        eps = price * 1e-7          # ignore le bruit numérique quand MACD et signal sont quasi confondus
        return {"buy": macd[-2] <= sig[-2] and macd[-1] - sig[-1] > eps, "sell": macd[-1] - sig[-1] < -eps,
                "info": f"histo {((macd[-1] - sig[-1]) / price) * 100:+.3f}%"}
    if strategy == "momentum":
        ret = (price / cl[-1 - cfg["mom_period"]] - 1) * 100
        r = (rsi_series(cl, 14) or [None])[-1]
        return {"buy": ret >= cfg["mom_min_pct"] and (r is None or r < 80), "sell": ret < 0, "info": f"{ret:+.1f}% sur {cfg['mom_period']}"}
    raise ValueError(strategy)
