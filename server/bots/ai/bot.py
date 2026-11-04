"""Bot IA : Claude analyse régulièrement le marché et ouvre / ferme jusqu'à 5 positions en parallèle.

Claude ne fait que PROPOSER (outil `decide`). Les garde-fous (guards.py) sont appliqués par le code ; les stops et objectifs sont
surveillés localement toutes les `check_every` secondes. Aucun stop n'est posé chez Kraken.
"""
import threading
import time
import uuid
from datetime import datetime

from server import settings
from server.core.claude import ClaudeError, CreditError, call_tool
from server.core.journal import Journal
from server.core.storage import load_json, save_json
from server.market import kraken
from server.market.pairs import LABELS, WATCH
from server.market.prices import last_price, try_last_price
from server.market.snapshot import market_snapshot
from . import config as cfgmod
from . import cost, guards, prompt

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
        self.config = {**cfgmod.DEFAULT_CONFIG, **load_json(CONFIG_FILE, {})}
        self.state = load_json(STATE_FILE) or self._fresh_state()

    # ---------- persistance et réglages ----------
    def _fresh_state(self):
        return {"cash": self.config["budget"], "positions": [], "trades": [], "pnl": 0.0, "decisions": [],
                "usage": {"day": "", "calls": 0, "in": 0, "out": 0, "tin": 0, "tout": 0}, "credit_ref": 0.0, "credit_low": False,
                "day": "", "day_pnl": 0.0}

    def _save(self):
        save_json(STATE_FILE, self.state)

    def update_config(self, new):
        with self.tlock, self.lock:
            cfg = cfgmod.validate(self.config, new, busy=self.running or bool(self.state["positions"]))
            if cfg["credit_base"] != self.config["credit_base"]:       # recalage : on repart du solde lu dans la console
                self.state["credit_ref"] = cost.spent_total(self.state["usage"], cfg)
                self.state["credit_low"] = False
            self.config = cfg
            save_json(CONFIG_FILE, cfg)
        self.log("Réglages IA enregistrés")

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
            self.log("Bot IA arrêté (les positions ouvertes restent ouvertes, plus aucun stop n'est surveillé)")

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
        """Remet à zéro le PnL et le compteur d'appels Claude du jour quand la date change."""
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
            p["peak"] = max(p["peak"], price)
            why = None
            if p["sl"] and price <= p["entry"] * (1 - p["sl"] / 100):
                why = f"Stop loss −{p['sl']}%"
            elif p["tp"] and price >= p["entry"] * (1 + p["tp"] / 100):
                why = f"Take profit +{p['tp']}%"
            elif p["trail"] and price <= p["peak"] * (1 - p["trail"] / 100):
                why = f"Stop suiveur −{p['trail']}%"
            if why:
                self._sell(p, price, why)
        self._save()

    def _price(self, position):
        """Prix actuel d'une position (dernière valeur connue, sinon son prix d'entrée)."""
        return try_last_price(position["pair"]) or position["entry"]

    # ---------- analyse par Claude ----------
    def _count_usage(self, tokens):
        usage = self.state["usage"]
        usage["calls"] += 1
        for key, total in (("in", "tin"), ("out", "tout")):
            usage[key] += tokens[key]
            usage[total] = usage.get(total, 0) + tokens[key]

    def _record_decision(self, view, actions):
        entry = {"time": datetime.now().strftime("%d/%m %H:%M"), "view": view[:600], "actions": actions, "mode": self.config["mode"]}
        self.state["decisions"] = (self.state["decisions"] + [entry])[-MAX_DECISIONS_KEPT:]

    def _review(self):
        c, s = self.config, self.state
        self._day_rollover()
        if s["usage"]["calls"] >= c["max_calls_per_day"]:
            return self.log("Plafond d'appels Claude du jour atteint : analyse sautée")
        self.reviewing = True
        try:
            pairs = list(dict.fromkeys(c["pairs"] + [p["pair"] for p in s["positions"]]))
            market = [r for r in market_snapshot(c["timeframe"], pairs) if "error" not in r]
            system, user = prompt.build(c, s, self._price, market)
            decision, tokens = call_tool(c["model"], system, user, prompt.DECIDE_TOOL)
            self._count_usage(tokens)
            results = [self._apply(a) for a in decision.get("actions", [])[:MAX_ACTIONS]]
            self._record_decision(str(decision.get("market_view", "")), results)
            self.log(f"Analyse Claude : {len(results)} action(s) proposée(s)")
        except ClaudeError as e:
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
        """Exécute une action de Claude après contrôle ; renvoie {ok, text, reason} pour l'historique des décisions."""
        kind, pair = action.get("type"), action.get("pair")
        position = next((p for p in self.state["positions"] if p["pair"] == pair), None)

        def result(ok, text):
            return {"ok": ok, "text": f"{kind} {LABELS.get(pair, pair)} — {text}", "reason": str(action.get("reason", ""))[:300]}

        try:
            if kind == "open":
                params, refusal = guards.vet_open(self.config, self.state, action)
                if refusal:
                    return result(False, refusal)
                self._buy(pair, params)
                return result(True, f"ouverte {params['size']:.0f} (SL {params['sl']}%)")
            if kind not in ("close", "adjust"):
                return result(False, "type inconnu")
            if not position:
                return result(False, "aucune position sur cette paire")
            if kind == "close":
                self._sell(position, last_price(pair, 0), "IA : " + str(action.get("reason", ""))[:120])
                return result(True, "fermée")
            guards.adjust(self.config, position, action)
            return result(True, f"SL {position['sl']}% · TP {position['tp']}% · suiveur {position['trail']}%")
        except Exception as e:
            return result(False, "erreur : " + str(e)[:150])

    def _buy(self, pair, params):
        c, s = self.config, self.state
        size = params["size"]
        price = last_price(pair, 0)
        if c["mode"] == "paper":
            s["cash"] -= size
        else:
            kraken.market_order(pair, "buy", size / price)
        position = {"id": uuid.uuid4().hex[:8], "pair": pair, "strategy": params["strategy"],
                    "qty": size * (1 - c["fee_pct"] / 100) / price, "entry": price, "cost": size, "peak": price,
                    "sl": params["sl"], "tp": params["tp"], "trail": params["trail"], "reason": params["reason"], "conf": params["conf"],
                    "ts": int(time.time()), "opened": datetime.now().strftime("%d/%m %H:%M")}
        s["positions"].append(position)
        self._record("BUY", position, price, 0, params["reason"])

    def _sell(self, position, price, why):
        c, s = self.config, self.state
        if c["mode"] == "live":
            kraken.market_order(position["pair"], "sell", position["qty"])
        proceeds = position["qty"] * price * (1 - c["fee_pct"] / 100)
        pnl = proceeds - position["cost"]
        if c["mode"] == "paper":
            s["cash"] += proceeds
        s["positions"] = [p for p in s["positions"] if p["id"] != position["id"]]
        s["pnl"] += pnl
        s["day_pnl"] += pnl
        self._record("SELL", position, price, pnl, why)

    def _record(self, side, position, price, pnl, why):
        mode = self.config["mode"]
        trade = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": mode, "side": side, "pair": position["pair"],
                 "strategy": position["strategy"], "price": price, "qty": position["qty"], "pnl": pnl, "why": why}
        self.state["trades"] = (self.state["trades"] + [trade])[-MAX_TRADES_KEPT:]
        self._save()
        self.log(f"{mode.upper()} {side} {LABELS.get(position['pair'], position['pair'])} @ {price:g} ({why})")

    def liquidate(self):
        with self.tlock:
            for p in list(self.state["positions"]):
                self._sell(p, last_price(p["pair"], 0), "Liquidation manuelle")

    def close_position(self, position_id):
        with self.tlock:
            p = next((x for x in self.state["positions"] if x["id"] == position_id), None)
            if not p:
                raise ValueError("Position introuvable")
            self._sell(p, last_price(p["pair"], 0), "Fermeture manuelle")

    # ---------- données pour l'interface ----------
    def snapshot(self):
        with self.lock:
            c, s = self.config, self.state
            fee = c["fee_pct"] / 100
            positions = []
            for p in s["positions"]:
                px = self._price(p)
                positions.append({**p, "label": LABELS.get(p["pair"], p["pair"]), "price": px, "pnl_pct": (px / p["entry"] - 1) * 100,
                                  "pnl": p["qty"] * px * (1 - fee) - p["cost"]})
            next_review = max(0, int(c["interval_min"] * 60 - (time.time() - self.last_review))) if self.running else None
            return {"config": c, "running": self.running, "reviewing": self.reviewing, "next_review_s": next_review,
                    "key_ok": settings.claude_configured(), "live_ok": settings.kraken_configured(),
                    "cash": s["cash"], "equity": s["cash"] + sum(p["qty"] * p["price"] for p in positions),
                    "pnl": s["pnl"], "day_pnl": s["day_pnl"], "positions": positions, "usage": s["usage"],
                    "cost": cost.summary(s, c),
                    "trades": [t for t in s["trades"] if t["mode"] == c["mode"]][-40:][::-1],
                    "decisions": s["decisions"][-15:][::-1], "logs": self.journal.recent(30),
                    "options": {"models": cfgmod.MODELS, "strategies": cfgmod.STRATEGIES, "pairs": [{"pair": p, "label": l} for p, l in WATCH],
                                "profiles": {k: v["desc"] for k, v in cfgmod.PROFILES.items()}}}
