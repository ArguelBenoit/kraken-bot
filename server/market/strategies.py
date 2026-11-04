"""Signaux des six méthodes sur bougies CLOSES : utilisés par le backtest.

`signal(strategy, rows, cfg)` reçoit les bougies [(t, o, h, l, c), ...] (la dernière = la plus récente) et renvoie
{"buy": bool, "sell": bool, "info": str} pour cette dernière bougie : `buy` = condition d'entrée, `sell` = condition de sortie,
`info` = lecture de l'indicateur. Les règles sont reproduites côté interface (web/src/lib/learn/methods.ts) pour le tutoriel.
"""
from .indicators import ema_series, rsi_last

METHODS = ("rsi", "trend", "bollinger", "donchian", "macd", "momentum")
# Paramètres par défaut de chaque méthode (le backtest en surcharge une partie)
DEFAULT_PARAMS = {
    "rsi_period": 14, "rsi_buy": 30, "rsi_sell": 70,
    "ma_fast": 20, "ma_slow": 50,
    "bb_period": 20, "bb_std": 2.0,
    "dc_entry": 20, "dc_exit": 10,
    "macd_fast": 12, "macd_slow": 26, "macd_signal": 9,
    "mom_period": 24, "mom_min_pct": 3.0,
}
NO_DATA = "données insuffisantes"


def _result(buy, sell, info):
    return {"buy": bool(buy), "sell": bool(sell), "info": info}


def _rsi(rows, cl, cfg):
    r = rsi_last(cl, cfg["rsi_period"])
    return _result(r <= cfg["rsi_buy"], r >= cfg["rsi_sell"], f"RSI {r:.1f}")


def _trend(rows, cl, cfg):
    f, s = ema_series(cl, cfg["ma_fast"]), ema_series(cl, cfg["ma_slow"])
    up = f[-1] > s[-1]
    cross = f[-2] <= s[-2] and up
    label = f"EMA{cfg['ma_fast']} {'>' if up else '<'} EMA{cfg['ma_slow']}" + (" (croisement)" if cross else "")
    return _result(cross, f[-1] < s[-1], label)


def _bollinger(rows, cl, cfg):
    n = cfg["bb_period"]
    window = cl[-n:]
    mid = sum(window) / n
    sd = (sum((x - mid) ** 2 for x in window) / n) ** 0.5
    low = mid - cfg["bb_std"] * sd
    pct_b = (cl[-1] - low) / (2 * cfg["bb_std"] * sd) if sd else 0.5
    return _result(cl[-1] < low, cl[-1] >= mid, f"%B {pct_b:.2f}")


def _donchian(rows, cl, cfg):
    high = max(r[2] for r in rows[-1 - cfg["dc_entry"]:-1])           # plus haut des bougies PRÉCÉDENTES
    low = min(r[3] for r in rows[-1 - cfg["dc_exit"]:-1])
    return _result(cl[-1] > high, cl[-1] < low, f"{(cl[-1] / high - 1) * 100:+.2f}% du plus haut {cfg['dc_entry']}")


def _macd(rows, cl, cfg):
    fast, slow = ema_series(cl, cfg["macd_fast"]), ema_series(cl, cfg["macd_slow"])
    line = [a - b for a, b in zip(fast, slow) if a is not None and b is not None]
    signal_line = ema_series(line, cfg["macd_signal"])
    if len(line) < 2 or signal_line[-2] is None:
        return _result(False, False, NO_DATA)
    eps = cl[-1] * 1e-7                      # ignore le bruit numérique quand MACD et signal sont quasi confondus
    gap = line[-1] - signal_line[-1]
    return _result(line[-2] <= signal_line[-2] and gap > eps, gap < -eps, f"histo {gap / cl[-1] * 100:+.3f}%")


def _momentum(rows, cl, cfg):
    change = (cl[-1] / cl[-1 - cfg["mom_period"]] - 1) * 100
    r = rsi_last(cl, 14)
    return _result(change >= cfg["mom_min_pct"] and (r is None or r < 80), change < 0, f"{change:+.1f}% sur {cfg['mom_period']}")


# méthode -> (nombre minimal de bougies, fonction de calcul)
_IMPL = {
    "rsi": (lambda c: c["rsi_period"] + 1, _rsi),
    "trend": (lambda c: c["ma_slow"] + 1, _trend),
    "bollinger": (lambda c: c["bb_period"] + 1, _bollinger),
    "donchian": (lambda c: max(c["dc_entry"], c["dc_exit"]) + 2, _donchian),
    "macd": (lambda c: c["macd_slow"] + c["macd_signal"] + 2, _macd),
    "momentum": (lambda c: c["mom_period"] + 2, _momentum),
}


def signal(strategy, rows, cfg):
    need, compute = _IMPL[strategy]
    if len(rows) < need(cfg):
        return _result(False, False, NO_DATA)
    return compute(rows, [r[4] for r in rows], cfg)


def trend_ok(rows, ema_n):
    """Filtre de tendance : dernier cours au-dessus de l'EMA(ema_n) ; None si pas assez de données."""
    e = ema_series([r[4] for r in rows], ema_n)[-1] if len(rows) >= ema_n else None
    return None if e is None else rows[-1][4] > e
