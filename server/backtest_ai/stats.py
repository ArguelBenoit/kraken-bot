"""Statistiques d'un backtest du Bot IA (fonctions pures)."""


def _max_drawdown_pct(equity):
    peak, worst = 0.0, 0.0
    for value in equity:
        peak = max(peak, value)
        if peak > 0:
            worst = min(worst, (value / peak - 1) * 100)
    return worst


def summarize(run, budget):
    """Résumé chiffré d'un run : rendement (et celui d'acheter-garder), trades clos, taux de réussite, gain moyen / perte moyenne, drawdown, frais, appels."""
    closes = [t["pnl"] for t in run["trades"] if t["kind"] == "close"]
    wins, losses = [p for p in closes if p > 0], [p for p in closes if p <= 0]
    equity = [row[1] for row in run["equity"]]
    last, hold = (run["equity"][-1][1], run["equity"][-1][2]) if run["equity"] else (budget, budget)
    avg_win = sum(wins) / len(wins) if wins else 0.0
    avg_loss = sum(losses) / len(losses) if losses else 0.0
    return {
        "return_pct": (last / budget - 1) * 100, "hold_pct": (hold / budget - 1) * 100, "pnl": last - budget,
        "trades": len(closes), "wins": len(wins), "win_rate": len(wins) / len(closes) * 100 if closes else None,
        "avg_win": avg_win, "avg_loss": avg_loss,
        "payoff": avg_win / -avg_loss if avg_loss < 0 and wins else None,
        "expectancy": sum(closes) / len(closes) if closes else None,
        "profit_factor": sum(wins) / -sum(losses) if sum(losses) < 0 else None,
        "max_drawdown_pct": _max_drawdown_pct(equity), "fees": run["fees"],
        "calls": run["progress"]["calls"], "tokens_in": run["usage"]["in"], "tokens_out": run["usage"]["out"],
        "errors": run["errors"], "refused": run["refused"],
    }
