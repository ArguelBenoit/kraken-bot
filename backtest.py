"""Backtest de la stratégie RSI sur l'historique Kraken (max 720 bougies par timeframe)."""
import itertools, sys
import kraken
from bot import rsi, rsi_series, ema_series

def run(closes, p, fee=0.26):
    pos = None; pnl = 0.0; trades = []; eq = 1.0; peak = 1.0; mdd = 0.0
    n = p["rsi_period"]; rs = rsi_series(closes, n)
    for i in range(n + 1, len(closes)):
        r = rs[i]; price = closes[i]
        if pos is None:
            if r <= p["rsi_buy"]: pos = price
        else:
            chg = (price / pos - 1) * 100
            if chg >= p["tp"] or chg <= -p["sl"] or r >= p["rsi_sell"]:
                ret = (price / pos) * (1 - fee/100) ** 2 - 1
                trades.append(ret); eq *= 1 + ret; peak = max(peak, eq); mdd = max(mdd, 1 - eq / peak); pos = None
    return {"ret": (eq - 1) * 100, "n": len(trades), "win": (sum(t > 0 for t in trades) / len(trades) * 100) if trades else 0, "mdd": mdd * 100}

def run_trend(closes, p, fee=0.26):
    """Suivi de tendance : achat sur croisement EMA rapide/lente, sortie sur croisement inverse, SL fixe, stop suiveur."""
    f, sl_ = ema_series(closes, p["fast"]), ema_series(closes, p["slow"])
    pos = peak = None; trades = []; eq = 1.0; pk = 1.0; mdd = 0.0
    for i in range(p["slow"] + 1, len(closes)):
        price = closes[i]
        if pos is None:
            if f[i - 1] <= sl_[i - 1] and f[i] > sl_[i]: pos = peak = price
        else:
            peak = max(peak, price); chg = (price / pos - 1) * 100
            if chg <= -p["sl"] or (p["trail"] > 0 and price <= peak * (1 - p["trail"] / 100)) or f[i] < sl_[i]:
                ret = (price / pos) * (1 - fee / 100) ** 2 - 1
                trades.append(ret); eq *= 1 + ret; pk = max(pk, eq); mdd = max(mdd, 1 - eq / pk); pos = None
    return {"ret": (eq - 1) * 100, "n": len(trades), "win": (sum(t > 0 for t in trades) / len(trades) * 100) if trades else 0, "mdd": mdd * 100}


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "trend":
    pair = sys.argv[1]; fee = float(sys.argv[3]) if len(sys.argv) > 3 else 0.26
    for tf in (60, 240, 1440):
        closes = kraken.candles(pair, tf); cut = int(len(closes) * 0.6)
        bh = (closes[-1] / closes[cut] - 1) * 100; rows = []
        for fa, sw, sl, tr in itertools.product((8, 12, 20), (30, 50, 100), (3, 5, 8), (0, 4, 8)):
            if fa >= sw: continue
            p = dict(fast=fa, slow=sw, sl=sl, trail=tr)
            a = run_trend(closes[:cut], p, fee); b = run_trend(closes[cut - sw - 1:], p, fee)
            if a["n"] >= 3: rows.append((a["ret"], b, p))
        rows.sort(key=lambda x: -x[0])
        if not rows: print(f"{pair} {tf}min: pas assez de trades"); continue
        allte = [r[1]["ret"] for r in rows]
        print(f"\n=== {pair} {tf}min trend fee={fee}  test={len(closes)-cut} bougies  buy&hold test={bh:+.1f}% | moy. test des configs={sum(allte)/len(allte):+.1f}% , %>0={sum(a>0 for a in allte)/len(allte)*100:.0f}%")
        for tr_ret, te, p in rows[:3]:
            print(f"  train {tr_ret:+6.1f}% -> TEST {te['ret']:+6.1f}% trades={te['n']:2d} win={te['win']:3.0f}% mdd={te['mdd']:4.1f}%  {p}")
    raise SystemExit

if __name__ == "__main__":
    pair = sys.argv[1] if len(sys.argv) > 1 else "ETHUSDC"
    for tf in (60, 240, 1440):
        closes = kraken.candles(pair, tf); cut = int(len(closes) * 0.6)
        bh = (closes[-1] / closes[cut] - 1) * 100
        rows = []
        for per, b, s, tp, sl in itertools.product((7, 14), (20, 25, 30, 35), (55, 65, 70), (2, 4, 6), (2, 4, 8)):
            p = dict(rsi_period=per, rsi_buy=b, rsi_sell=s, tp=tp, sl=sl)
            tr = run(closes[:cut], p); te = run(closes[cut - per - 1:], p)
            if tr["n"] >= 5: rows.append((tr["ret"], te, p))
        rows.sort(key=lambda x: -x[0])
        allte = [r[1]["ret"] for r in rows]
        print(f"\n=== {pair} {tf}min  bougies={len(closes)} test={len(closes)-cut}  buy&hold test={bh:+.1f}%  | moy. test de toutes les configs={sum(allte)/len(allte):+.1f}% , %config>0 en test={sum(a>0 for a in allte)/len(allte)*100:.0f}%")
        for tr_ret, te, p in rows[:4]:
            print(f"  train {tr_ret:+6.1f}% -> TEST {te['ret']:+6.1f}% trades={te['n']:2d} win={te['win']:3.0f}% mdd={te['mdd']:4.1f}%  {p}")
