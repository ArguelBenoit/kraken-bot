"""Rejeu du Bot IA sur des bougies passées : à chaque pas, le modèle ne voit que les bougies déjà terminées ; ses actions passent par les garde-fous réels
(`guards`) puis les stops, objectifs, suiveurs et liquidations sont rejoués sur les bougies suivantes.

Hypothèses prudentes : prix d'exécution = ouverture de la bougie ; si un stop et l'objectif sont touchés dans la même bougie, le stop passe d'abord ;
un trou (la bougie ouvre au-delà du niveau) s'exécute à l'ouverture ; le stop suiveur utilise le plus haut des bougies PRÉCÉDENTES. Aucun glissement de prix.
Tout se passe dans un portefeuille paper isolé : ni l'état du vrai bot, ni Kraken (hors lecture des bougies) ne sont touchés.
"""
from datetime import datetime

from server.bots import positions as pos
from server.bots.ai import config as cfgmod, guards, prompt
from server.bots.ai.account import make_position
from server.core.llm import call_tool
from server.core.transport import CreditError, LlmError
from server.market.pairs import LABELS
from server.market.snapshot import pair_row
from . import stats
from .data import WARMUP

MAX_ACTIONS = 10             # actions traitées par analyse (comme le vrai bot)
MAX_ERRORS_IN_A_ROW = 3


class StopRun(Exception):
    """Fin anticipée voulue (plafond d'appels atteint, erreurs répétées) : le run garde ce qu'il a déjà calculé."""


def _fmt(t):
    return datetime.fromtimestamp(t).strftime("%d/%m %H:%M")


class Replay:
    """Un rejeu. `run` (dict partagé avec l'interface) reçoit au fil de l'eau : progression, courbes, trades, décisions et statistiques."""

    def __init__(self, cfg, candles, days, run, max_calls=None, cancel=None, gate=None):
        self.cfg, self.candles, self.run, self.max_calls, self.cancel, self.gate = cfg, candles, run, max_calls, cancel, gate
        self.tf = cfg["timeframe"]
        first = next(iter(candles.values()))
        self.count = len(first)
        self.start = max(WARMUP, self.count - int(days * 1440 / self.tf))
        self.every = max(1, round(cfg["interval_min"] / self.tf))        # une analyse toutes les `every` bougies
        self.state = {"cash": cfg["budget"], "positions": [], "day_pnl": 0.0}
        self.day, self.errors_in_a_row = "", 0
        run["progress"].update(step=0, steps=-(-(self.count - self.start) // self.every), calls=0, at="")
        self.base = {p: rows[self.start][1] for p, rows in candles.items()}     # prix d'achat de la référence « acheter et garder »

    # ---------- boucle ----------
    def go(self):
        for i in range(self.start, self.count):
            while self.gate and not self.gate.wait(0.3):         # en pause : on attend la reprise (ou l'annulation)
                if self.cancel and self.cancel.cancelled:
                    return
            if self.cancel and self.cancel.cancelled:
                return
            t = self.candles[next(iter(self.candles))][i][0]
            day = datetime.fromtimestamp(t).strftime("%Y-%m-%d")
            if day != self.day:
                self.day, self.state["day_pnl"] = day, 0.0
            if (i - self.start) % self.every == 0:
                self._review(i, t)
                self.run["progress"]["step"] += 1
            for p in list(self.state["positions"]):
                self._candle(p, i, t)
            self._point(i, t)
            self.run["progress"]["at"] = _fmt(t)
            self.run["stats"] = stats.summarize(self.run, self.cfg["budget"])

    # ---------- analyse du modèle ----------
    def _market(self, i):
        rows, n24 = [], max(1, 1440 // self.tf)
        for pair in self.cfg["pairs"]:
            known = self.candles[pair][:i]                              # bougies terminées : rien du futur
            price = self.candles[pair][i][1]                            # prix du moment = ouverture de la bougie
            before = known[-n24][4] if len(known) >= n24 else known[0][4]
            rows.append(pair_row(pair, known, price, (price / before - 1) * 100))
        return rows

    def _review(self, i, t):
        progress, run = self.run["progress"], self.run
        if self.max_calls is not None and progress["calls"] >= self.max_calls:
            raise StopRun(f"plafond de {self.max_calls} appels atteint")
        system, user = prompt.build(self.cfg, self.state, lambda p: self.candles[p["pair"]][i][1], self._market(i), now=t)
        try:
            decision, tokens = call_tool(self.cfg["provider"], self.cfg["model"], system, user, prompt.DECIDE_TOOL, cancel=self.cancel)
        except LlmError as e:
            if e.status == 499:
                raise                                                   # annulation : remontée telle quelle
            self._count(e.usage)
            run["errors"] += 1
            self.errors_in_a_row += 1
            run["decisions"].append({"time": _fmt(t), "view": "", "actions": [{"ok": False, "text": "Erreur : " + str(e)[:300]}], "mode": "paper"})
            if isinstance(e, CreditError) or self.errors_in_a_row >= MAX_ERRORS_IN_A_ROW:
                raise StopRun(str(e)[:200])
            return
        self.errors_in_a_row = 0
        self._count(tokens)
        results = [self._apply(a, i, t) for a in decision.get("actions", [])[:MAX_ACTIONS]]
        run["refused"] += sum(1 for r in results if not r["ok"])
        run["decisions"].append({"time": _fmt(t), "view": str(decision.get("market_view", ""))[:600], "actions": results, "mode": "paper"})

    def _count(self, tokens):
        self.run["progress"]["calls"] += 1
        for key in ("in", "out"):
            self.run["usage"][key] += tokens[key]

    # ---------- exécution des actions (mêmes règles que le vrai bot) ----------
    def _apply(self, action, i, t):
        kind, pair = action.get("type"), action.get("pair")
        position = next((p for p in self.state["positions"] if p["pair"] == pair), None)

        def result(ok, text):
            return {"ok": ok, "text": f"{kind} {LABELS.get(pair, pair)} — {text}", "reason": str(action.get("reason", ""))[:300]}

        try:
            if kind == "open":
                params, refusal = guards.vet_open(self.cfg, self.state, action)
                if refusal:
                    return result(False, refusal)
                self._open(pair, params, self.candles[pair][i][1], t)
                return result(True, f"{'SHORT ×%g ' % params['leverage'] if params['side'] == 'short' else ''}ouverte {params['size']:.0f} (SL {params['sl']}%)")
            if kind not in ("close", "adjust"):
                return result(False, "type inconnu")
            if not position:
                return result(False, "aucune position sur cette paire")
            if kind == "close":
                self._close(position, self.candles[pair][i][1], "IA : " + str(action.get("reason", ""))[:120], t)
                return result(True, "fermée")
            refused = guards.adjust(self.cfg, position, action)
            note = f"SL {position['sl']}% · TP {position['tp']}% · suiveur {position['trail']}%"
            return result(True, note + "".join(f" · {r}" for r in refused))
        except Exception as e:
            return result(False, "erreur : " + str(e)[:150])

    def _open(self, pair, params, price, t):
        c, s = self.cfg, self.state
        fields, needed = pos.open_fields(params["side"], params["size"], price, params["leverage"], c["fee_pct"], cfgmod.MARGIN_FEE_PCT)
        s["cash"] -= needed
        position = make_position(pair, params, price, fields, t, _fmt(t))
        s["positions"].append(position)
        self.run["fees"] += fields["open_fees"] if params["side"] == "short" else params["size"] * c["fee_pct"] / 100
        self._trade("open", position, price, 0.0, params["reason"], t)

    def _close(self, p, price, why, t):
        c, s = self.cfg, self.state
        rollover = pos.rollover_due(p, t, cfgmod.ROLLOVER_PCT)
        qty, pnl, cash_delta = pos.close_amounts(p, price, 1.0, c["fee_pct"], rollover)
        s["cash"] += cash_delta
        s["positions"] = [x for x in s["positions"] if x["id"] != p["id"]]
        s["day_pnl"] += pnl
        self.run["fees"] += price * qty * c["fee_pct"] / 100 + rollover
        self._trade("close", p, price, pnl, why, t)

    def _trade(self, kind, p, price, pnl, why, t):
        direction = p["side"]
        self.run["trades"].append({
            "time": _fmt(t), "mode": "paper", "side": "BUY" if (kind == "open") == (direction == "long") else "SELL", "dir": direction, "kind": kind,
            "pair": p["pair"], "strategy": p["strategy"], "price": price, "qty": p["qty"], "pnl": pnl, "why": why,
            "held_h": round((t - p["ts"]) / 3600, 1) if kind == "close" else 0})

    # ---------- une bougie : stops, objectifs, liquidation ----------
    def _candle(self, p, i, t):
        _, o, h, low, _ = self.candles[p["pair"]][i]
        short = pos.is_short(p)
        sl, tp, trail = pos.stop_prices(p)
        liq = pos.liq_price(p)
        touched = (lambda level: h >= level) if short else (lambda level: low <= level)       # niveau adverse atteint
        worse = max if short else min                                                         # un trou contre la position s'exécute à l'ouverture
        better = min if short else max
        end = t + self.tf * 60
        if liq is not None and h >= liq:
            return self._close(p, max(o, liq), "liquidation simulée", end)
        if sl and touched(sl):
            return self._close(p, worse(o, sl), f"stop loss {'+' if short else '−'}{p['sl']:g}%", end)
        if trail and touched(trail):
            return self._close(p, worse(o, trail), f"stop suiveur {'+' if short else '−'}{p['trail']:g}%", end)
        if tp and ((low <= tp) if short else (h >= tp)):
            return self._close(p, better(o, tp), f"take profit {'−' if short else '+'}{p['tp']:g}%", end)
        p["peak"] = pos.best_price(p, low if short else h)

    # ---------- courbes ----------
    def _point(self, i, t):
        s, c = self.state, self.cfg
        close = lambda pair: self.candles[pair][i][4]
        equity = s["cash"] + sum(pos.equity_value(p, close(p["pair"])) for p in s["positions"])
        hold = c["budget"] * sum((1 - c["fee_pct"] / 100) * close(pair) / self.base[pair] for pair in self.base) / len(self.base)
        self.run["equity"].append([t + self.tf * 60, round(equity, 2), round(hold, 2)])
