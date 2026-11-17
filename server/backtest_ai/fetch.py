"""Télécharge d'avance les marchés passés du backtest (`python -m server.backtest_ai.fetch [durées de bougie en minutes]`), pour les rejouer ensuite sans réseau.
Sans argument : toutes les durées (15, 60, 240, 1440). Ce qui est déjà sur le disque n'est pas retéléchargé."""
import calendar
import sys
import time

from server.market.pairs import WATCH
from . import history
from .data import MAX_CANDLES
from .scenarios import SCENARIOS


def main(argv):
    tfs = [int(a) for a in argv] or list(history.INTERVALS)
    pairs = [p for p, _ in WATCH]
    for tf in tfs:
        for sc in SCENARIOS:
            end_ts = calendar.timegm(time.strptime(sc["end"], "%Y-%m-%d"))
            started = time.time()
            rows = history.period(pairs, tf, end_ts, MAX_CANDLES)
            usable = sum(1 for series in rows.values() if len(series) >= 70)
            print(f"{sc['trend']:7} {sc['end']} · {tf:4} min · {usable}/{len(pairs)} paires ({time.time() - started:.0f} s)", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
