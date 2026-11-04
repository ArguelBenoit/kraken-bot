"""Backtest d'une méthode sur l'historique Kraken (720 bougies maximum par durée).

    python -m server.backtest ETHUSDC <rsi|trend|bollinger|donchian|macd|momentum> [frais_%] [filtre_ema]

Chaque combinaison de réglages est entraînée sur les 60 % les plus anciens puis testée sur les 40 % restants. Attention : choisir la
meilleure parmi des centaines crée un biais de sélection, les résultats affichés sont optimistes.
"""
import itertools
import sys

from server.bots.simple.config import DEFAULT_CONFIG
from server.market import kraken, strategies

TRAIN_SHARE = 0.6
WINDOW = 300          # bougies passées fournies à chaque calcul de signal


def run(rows, strategy, cfg, sl, tp, trail, fee=0.26, start=0, ema_filter=0):
    """Rejoue `rows` bougie par bougie (une position à la fois) avec les mêmes signaux que le bot."""
    entry = peak = None
    returns, equity, top, drawdown = [], 1.0, 1.0, 0.0
    for i in range(max(start, 1), len(rows)):
        window = rows[max(0, i - WINDOW):i + 1]
        sig = strategies.signal(strategy, window, cfg)
        price = window[-1][4]
        if entry is None:
            if sig["buy"] and (not ema_filter or strategies.trend_ok(window, ema_filter)):
                entry = peak = price
            continue
        peak = max(peak, price)
        change = (price / entry - 1) * 100
        fixed_target = strategy in ("rsi", "bollinger")
        if (change <= -sl or (fixed_target and change >= tp) or (not fixed_target and trail > 0 and price <= peak * (1 - trail / 100))
                or sig["sell"]):
            ret = (price / entry) * (1 - fee / 100) ** 2 - 1        # frais à l'achat ET à la vente
            returns.append(ret)
            equity *= 1 + ret
            top = max(top, equity)
            drawdown = max(drawdown, 1 - equity / top)
            entry = None
    wins = sum(r > 0 for r in returns)
    return {"ret": (equity - 1) * 100, "n": len(returns), "win": wins / len(returns) * 100 if returns else 0, "mdd": drawdown * 100}


# Combinaisons testées par méthode : (surcharges de réglages, stop loss %, take profit %, stop suiveur %).
GRIDS = {
    "rsi": lambda: [({"rsi_period": p, "rsi_buy": b, "rsi_sell": s}, sl, tp, 0)
                    for p, b, s, tp, sl in itertools.product((7, 14), (20, 25, 30, 35), (55, 65, 70), (2, 4, 6), (2, 4, 8))],
    "trend": lambda: [({"ma_fast": f, "ma_slow": s}, sl, 0, tr)
                      for f, s, sl, tr in itertools.product((8, 12, 20), (30, 50, 100), (3, 5, 8), (0, 4, 8)) if f < s],
    "bollinger": lambda: [({"bb_period": a, "bb_std": b}, sl, tp, 0)
                          for a, b, sl, tp in itertools.product((14, 20, 30), (1.5, 2.0, 2.5), (2, 4, 8), (2, 4))],
    "donchian": lambda: [({"dc_entry": a, "dc_exit": b}, sl, 0, tr)
                         for a, b, sl, tr in itertools.product((10, 20, 40), (5, 10, 20), (3, 5, 8), (0, 5)) if b < a],
    "macd": lambda: [({"macd_fast": a, "macd_slow": b, "macd_signal": c}, sl, 0, tr)
                     for (a, b, c), sl, tr in itertools.product(((12, 26, 9), (8, 17, 9), (5, 35, 5)), (3, 5, 8), (0, 5))],
    "momentum": lambda: [({"mom_period": a, "mom_min_pct": b}, sl, 0, tr)
                         for a, b, sl, tr in itertools.product((12, 24, 48), (2, 4, 6), (3, 5, 8), (0, 5))],
}


def main(argv):
    if len(argv) < 3 or argv[2] not in GRIDS:
        sys.exit(__doc__)
    pair, strategy = argv[1], argv[2]
    fee = float(argv[3]) if len(argv) > 3 else 0.26
    ema_filter = int(argv[4]) if len(argv) > 4 else 0
    for tf in (60, 240, 1440):
        rows = kraken.closed_candles(pair, tf)
        cut = int(len(rows) * TRAIN_SHARE)
        buy_hold = (rows[-1][4] / rows[cut][4] - 1) * 100
        results = []
        for overrides, sl, tp, trail in GRIDS[strategy]():
            cfg = {**DEFAULT_CONFIG, **overrides}
            train = run(rows[:cut], strategy, cfg, sl, tp, trail, fee, ema_filter=ema_filter)
            test = run(rows, strategy, cfg, sl, tp, trail, fee, start=cut, ema_filter=ema_filter)
            if train["n"] >= 3:
                results.append((train["ret"], test, {**overrides, "sl": sl, "tp": tp, "trail": trail}))
        if not results:
            print(f"{pair} {tf}min {strategy}: pas assez de trades")
            continue
        results.sort(key=lambda r: -r[0])
        tests = [r[1]["ret"] for r in results]
        print(f"\n=== {pair} {tf}min {strategy} frais={fee} filtre_ema={ema_filter}  test={len(rows) - cut} bougies  "
              f"buy&hold test={buy_hold:+.1f}% | moy. test des configs={sum(tests) / len(tests):+.1f}% , "
              f"%>0={sum(t > 0 for t in tests) / len(tests) * 100:.0f}% ({len(results)} configs)")
        for train_ret, test, params in results[:3]:
            print(f"  train {train_ret:+6.1f}% -> TEST {test['ret']:+6.1f}% trades={test['n']:2d} "
                  f"win={test['win']:3.0f}% mdd={test['mdd']:4.1f}%  {params}")


if __name__ == "__main__":
    main(sys.argv)
