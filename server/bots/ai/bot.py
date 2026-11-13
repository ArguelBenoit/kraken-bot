"""Bot IA : Le modèle analyse régulièrement le marché et ouvre / ferme jusqu'à 5 positions en parallèle.

Le modèle ne fait que PROPOSER (outil `decide`). Les garde-fous (guards.py) sont appliqués par le code ; les stops et objectifs sont
surveillés localement toutes les `check_every` secondes en paper. En **live**, comme pour le trading manuel, le stop loss (ou à défaut
le stop suiveur) est posé CHEZ KRAKEN (`bots/live.py`) : il protège la position même si ce programme s'arrête ; l'objectif et, quand il y a
un stop loss, le stop suiveur restent surveillés ici. Jamais exécuté sur un compte réel.
Le modèle peut aussi ouvrir des **shorts** (vente à découvert en marge, calculs de `bots/positions.py`) si l'option `allow_short` est cochée (désactivée par défaut) : le short live n'a jamais été validé chez Kraken.
"""
import threading
import time
from datetime import datetime

from server import settings
from server.core.llm import call_tool
from server.core.transport import CreditError, LlmError
from server.core.providers import key_set, public
from server.core.journal import Journal
from server.core.storage import load_json, save_json
from server.market.pairs import LABELS, WATCH
from server.market.prices import last_price, try_last_price
from server.market.snapshot import market_snapshot
from server.bots import live, positions as pos
from . import config as cfgmod
from . import guards, prompt
from .account import make_position

CONFIG_FILE, STATE_FILE = settings.data_file("ai_config.json"), settings.data_file("ai_state.json")
MAX_ACTIONS = 10             # actions traitées par analyse
MAX_TRADES_KEPT, MAX_DECISIONS_KEPT = 300, 40


class AIBot:
    def __init__(self):
        self.lock = threading.Lock()
        self.tlock = threading.RLock()       # une analyse / un ordre à la fois
        self.running = False
        self.thread = None
        self.journal = Journal()
        self.log = self.journal.add
        self.last_review = 0.0
        self.reviewing = False
        saved = load_json(CONFIG_FILE, {})
        if saved.get("limit_calls") is False:             # ancien réglage « plafond désactivé » -> champ vide
            saved["max_calls_per_day"] = None
        self.config = {**cfgmod.DEFAULT_CONFIG, **{k: v for k, v in saved.items() if k in cfgmod.DEFAULT_CONFIG}}
        self.state = load_json(STATE_FILE) or self._fresh_state()
        self._follow_budget(self.config["budget"], self.config["budget"])      # recale un cash resté sur un ancien budget

    # ---------- persistance et réglages ----------
    def _fresh_state(self):
        return {"cash": self.config["budget"], "positions": [], "trades": [], "pnl": 0.0, "decisions": [],
                "usage": {"day": "", "calls": 0, "in": 0, "out": 0}, "credit_low": False,
                "day": "", "day_pnl": 0.0}

    def _save(self):
        save_json(STATE_FILE, self.state)

    def update_config(self, new):
        with self.tlock, self.lock:
            cfg = cfgmod.validate(self.config, new, busy=self.running or bool(self.state["positions"]))
            if (cfg["provider"], cfg["model"]) != (self.config["provider"], self.config["model"]):
                self.state["credit_low"] = False         # autre modèle ou autre compte : on réessaie
            self._follow_budget(self.config["budget"], cfg["budget"])
            self.config = cfg
            save_json(CONFIG_FILE, cfg)
            self._save()
        self.log("Réglages IA enregistrés")

    def _follow_budget(self, old, new):
        """Le cash suit le budget : sans position il vaut budget + PnL réalisé (cela corrige aussi un ancien écart) ; avec des positions, on ajoute la différence."""
        if not self.state["positions"]:
            self.state["cash"] = new + self.state["pnl"]
        elif new != old:
            self.state["cash"] += new - old

    def reset_paper(self):
        with self.tlock, self.lock:
            if self.config["mode"] == "live" and self.state["positions"]:
                raise ValueError("Positions live ouvertes : ferme-les d'abord")
            self.state = self._fresh_state()
            self._save()
        self.log("Portefeuille IA réinitialisé")

    # ---------- boucle ----------
    def start(self):
        if self.running:
            return
        self.running = True
        self.state["credit_low"] = False
        self.last_review = 0.0
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        self.log(f"Bot IA démarré en mode {self.config['mode'].upper()}")

    def stop(self):
        if self.running:
            self.running = False
            self.log("Bot IA arrêté (les positions ouvertes restent ouvertes : en live le stop reste posé chez Kraken, en paper plus rien n'est surveillé)")

    def _loop(self):
        while self.running:
            try:
                with self.tlock:
                    self._monitor()
                    if time.time() - self.last_review >= self.config["interval_min"] * 60:
                        self.last_review = time.time()
                        self._review()
            except Exception as e:
                self.log(f"ERREUR: {e}")
            for _ in range(int(self.config["check_every"])):      # attente interruptible par stop()
                if not self.running:
                    return
                time.sleep(1)

    def analyze_now(self):
        """Lance une analyse immédiate en arrière-plan (même si le bot est arrêté : elle propose et exécute selon les règles)."""
        if self.reviewing:
            raise ValueError("Analyse déjà en cours")
        threading.Thread(target=self._manual_review, daemon=True).start()

    def _manual_review(self):
        try:
            with self.tlock:
                self.last_review = time.time()
                self._review()
        except Exception as e:
            self.log(f"ERREUR: {e}")

    # ---------- suivi local des positions ----------
    def _day_rollover(self):
        """Remet à zéro le PnL et le compteur d'appels du jour quand la date change."""
        today = datetime.now().strftime("%Y-%m-%d")
        if self.state["day"] != today:
            self.state["day"], self.state["day_pnl"] = today, 0.0
        usage = self.state["usage"]
        if usage["day"] != today:
            usage.update(day=today, calls=0, **{"in": 0, "out": 0})

    def _monitor(self):
        """Stop loss, take profit et stop suiveur de chaque position, avec le prix courant."""
        self._day_rollover()
        for p in list(self.state["positions"]):
            try:
                price = last_price(p["pair"], 0)
            except Exception as e:
                self.log(f"Prix {p['pair']} indisponible: {e}")
                continue
            if self.config["mode"] == "live" and live.reconcile(p, lambda fill: self._close(p, price, "stop déclenché chez Kraken", settled=fill), self.log):
                continue
            p["peak"] = pos.best_price(p, price)
            why = pos.trigger_reason(p, price, p.get("stop_kind") if self.config["mode"] == "live" else None)
            if why:
                try:
                    self._close(p, price, why)
                except Exception as e:
                    self.log(f"Fermeture automatique impossible ({p['pair']}) : {e}")
        self._save()

    def _price(self, position):
        """Prix actuel d'une position (dernière valeur connue, sinon son prix d'entrée)."""
        return try_last_price(position["pair"]) or position["entry"]

    # ---------- analyse par le modèle ----------
    def _count_usage(self, tokens):
        usage = self.state["usage"]
        usage["calls"] += 1
        for key in ("in", "out"):
            usage[key] += tokens[key]

    def _record_decision(self, view, actions):
        entry = {"time": datetime.now().strftime("%d/%m %H:%M"), "view": view[:600], "actions": actions, "mode": self.config["mode"]}
        self.state["decisions"] = (self.state["decisions"] + [entry])[-MAX_DECISIONS_KEPT:]

    def _review(self):
        c, s = self.config, self.state
        self._day_rollover()
        if c["max_calls_per_day"] is not None and s["usage"]["calls"] >= c["max_calls_per_day"]:
            return self.log("Plafond d'appels du jour atteint : analyse sautée")
        self.reviewing = True
        try:
            pairs = list(dict.fromkeys(c["pairs"] + [p["pair"] for p in s["positions"]]))
            market = [r for r in market_snapshot(c["timeframe"], pairs) if "error" not in r]
            system, user = prompt.build(c, s, self._price, market)
            decision, tokens = call_tool(c["provider"], c["model"], system, user, prompt.DECIDE_TOOL)
            self._count_usage(tokens)
            results = [self._apply(a) for a in decision.get("actions", [])[:MAX_ACTIONS]]
            self._record_decision(str(decision.get("market_view", "")), results)
            self.log(f"Analyse du modèle : {len(results)} action(s) proposée(s)")
        except LlmError as e:
            if e.usage["in"] or e.usage["out"]:
                self._count_usage(e.usage)
            self._record_decision("", [{"text": "Erreur : " + str(e)[:300], "ok": False}])
            self.log(f"ERREUR analyse: {e}")
            if isinstance(e, CreditError):          # inutile de continuer à appeler l'API : on arrête le bot
                s["credit_low"] = True
                self.running = False
        except Exception as e:
            self._record_decision("", [{"text": "Erreur : " + str(e)[:300], "ok": False}])
            self.log(f"ERREUR analyse: {e}")
        finally:
            self.reviewing = False
            self._save()

    # ---------- exécution des actions proposées ----------
    def _apply(self, action):
        """Exécute une action du modèle après contrôle ; renvoie {ok, text, reason} pour l'historique des décisions."""
        kind, pair = action.get("type"), action.get("pair")
        position = next((p for p in self.state["positions"] if p["pair"] == pair), None)

        def result(ok, text):
            return {"ok": ok, "text": f"{kind} {LABELS.get(pair, pair)} — {text}", "reason": str(action.get("reason", ""))[:300]}

        try:
            if kind == "open":
                params, refusal = guards.vet_open(self.config, self.state, action)
                if refusal:
                    return result(False, refusal)
                self._open(pair, params)
                kind_txt = f"SHORT ×{params['leverage']:g} " if params["side"] == "short" else ""
                return result(True, f"{kind_txt}ouverte {params['size']:.0f} (SL {params['sl']}%)")
            if kind not in ("close", "adjust"):
                return result(False, "type inconnu")
            if not position:
                return result(False, "aucune position sur cette paire")
            if kind == "close":
                self._close(position, last_price(pair, 0), "IA : " + str(action.get("reason", ""))[:120])
                return result(True, "fermée")
            refused = guards.adjust(self.config, position, action)
            if self.config["mode"] == "live":
                live.protect(position, self.log, replace=True)           # le stop Kraken suit les nouveaux niveaux
            note = f"SL {position['sl']}% · TP {position['tp']}% · suiveur {position['trail']}%"
            return result(True, note + "".join(f" · {r}" for r in refused))
        except Exception as e:
            return result(False, "erreur : " + str(e)[:150])

    def _open(self, pair, params):
        """Ouvre la position contrôlée par `guards.vet_open` : achat (long) ou vente à découvert en marge (short), en paper ou en live."""
        c, s = self.config, self.state
        size, short, leverage = params["size"], params["side"] == "short", params["leverage"]
        price = last_price(pair, 0)
        fill = None
        if c["mode"] == "paper":
            fields, needed = pos.open_fields(params["side"], size, price, leverage, c["fee_pct"], cfgmod.MARGIN_FEE_PCT)
            s["cash"] -= needed
        elif short:
            fill = live.enter(pair, "short", size / price, leverage)             # prix et volume RÉELS de l'exécution
            price = fill["price"] or price
            fields = {**pos.open_short(fill["cost"], price, leverage, c["fee_pct"], cfgmod.MARGIN_FEE_PCT), "qty": fill["volume"], "open_fees": fill["fee"]}
            fields["cost"] = fields["collateral"]
        else:
            fill = live.enter(pair, "long", size / price, 1.0)
            price = fill["price"] or price
            fields = {"qty": fill["volume"], "cost": fill["cost"] + fill["fee"]}
        position = make_position(pair, params, price, fields, int(time.time()), datetime.now().strftime("%d/%m %H:%M"))
        s["positions"].append(position)
        self._record("open", position, price, 0, params["reason"])
        if c["mode"] == "live":
            live.protect(position, self.log)
            self._save()

    def _close(self, position, price, why, settled=None):
        """Ferme la position (vente d'un long, rachat d'un short). `settled` = exécution d'un stop déjà déclenché par Kraken (rien à envoyer, on enregistre)."""
        c, s = self.config, self.state
        fill = settled
        if fill is None and c["mode"] == "live":
            fill = live.exit_market(position, position["qty"])
        if fill:
            price = fill["price"] or price
        if pos.is_short(position):
            rollover = pos.rollover_due(position, time.time(), cfgmod.ROLLOVER_PCT)
            _, pnl, cash_delta = pos.close_amounts(position, price, 1.0, c["fee_pct"], rollover)
        else:
            cash_delta = fill["cost"] - fill["fee"] if fill else position["qty"] * price * (1 - c["fee_pct"] / 100)
            pnl = cash_delta - position["cost"]
        if c["mode"] == "paper":
            s["cash"] += cash_delta
        s["positions"] = [p for p in s["positions"] if p["id"] != position["id"]]
        s["pnl"] += pnl
        s["day_pnl"] += pnl
        self._record("close", position, price, pnl, why)

    def _record(self, kind, position, price, pnl, why):
        """Journal des trades : `kind` = open | close ; `side` = sens réel de l'ordre (un short s'ouvre par une vente et se ferme par un achat)."""
        mode, direction = self.config["mode"], position.get("side", "long")
        side = "BUY" if (kind == "open") == (direction == "long") else "SELL"
        trade = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": mode, "side": side, "dir": direction, "kind": kind, "pair": position["pair"],
                 "strategy": position["strategy"], "price": price, "qty": position["qty"], "pnl": pnl, "why": why}
        self.state["trades"] = (self.state["trades"] + [trade])[-MAX_TRADES_KEPT:]
        self._save()
        label = {"open": {"long": "achat", "short": "short"}, "close": {"long": "vente", "short": "rachat"}}[kind][direction]
        self.log(f"{mode.upper()} {label} {LABELS.get(position['pair'], position['pair'])} @ {price:g} ({why})")

    def liquidate(self):
        with self.tlock:
            for p in list(self.state["positions"]):
                self._close(p, last_price(p["pair"], 0), "Liquidation manuelle")

    def close_position(self, position_id):
        with self.tlock:
            p = next((x for x in self.state["positions"] if x["id"] == position_id), None)
            if not p:
                raise ValueError("Position introuvable")
            self._close(p, last_price(p["pair"], 0), "Fermeture manuelle")

    # ---------- données pour l'interface ----------
    def _position_view(self, p):
        """Position enrichie pour l'interface : prix actuel, gains, niveaux de stop en prix, liquidation estimée (short)."""
        c = self.config
        px = self._price(p)
        q = {**p, "side": p.get("side", "long"), "leverage": p.get("leverage", 1.0)}
        rollover = pos.rollover_due(q, time.time(), cfgmod.ROLLOVER_PCT)
        sl, tp, trail = pos.stop_prices(q)
        return {**q, "label": LABELS.get(p["pair"], p["pair"]), "price": px, "pnl": pos.unrealized(q, px, c["fee_pct"], rollover),
                "pnl_pct": pos.favorable_pct(q, px), "equity_value": pos.equity_value(q, px), "rollover": rollover,
                "liq_price": pos.liq_price(q), "notional": q["qty"] * q["entry"], "sl_price": sl, "tp_price": tp, "trail_price": trail,
                "exchange_stop": bool(p.get("stop_id")) if c["mode"] == "live" else None}

    def snapshot(self):
        with self.lock:
            c, s = self.config, self.state
            positions = [self._position_view(p) for p in s["positions"]]
            next_review = max(0, int(c["interval_min"] * 60 - (time.time() - self.last_review))) if self.running else None
            return {"config": c, "running": self.running, "reviewing": self.reviewing, "next_review_s": next_review,
                    "key_ok": key_set(c["provider"]), "live_ok": settings.kraken_configured(),
                    "cash": s["cash"], "equity": s["cash"] + sum(p["equity_value"] for p in positions),
                    "pnl": s["pnl"], "day_pnl": s["day_pnl"], "positions": positions, "usage": s["usage"],
                    "credit_low": bool(s.get("credit_low")),
                    "trades": [t for t in s["trades"] if t["mode"] == c["mode"]][-40:][::-1],
                    "decisions": s["decisions"][-15:][::-1], "logs": self.journal.recent(30),
                    "options": {"providers": public(), "strategies": cfgmod.STRATEGIES, "pairs": [{"pair": p, "label": l} for p, l in WATCH],
                                "profiles": {k: v["desc"] for k, v in cfgmod.PROFILES.items()}}}
