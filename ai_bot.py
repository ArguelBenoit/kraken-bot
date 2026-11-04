"""Bot IA : Claude analyse régulièrement le marché et ouvre/ferme jusqu'à 5 positions en parallèle.

Principe de sécurité : Claude ne fait que PROPOSER (via un outil `decide` à schéma strict). Tous les garde-fous
(nb max de positions, montant, stop loss obligatoire, perte journalière, budget d'appels) sont appliqués par le code,
Claude ne peut pas les contourner. Les stops/TP sont surveillés localement toutes les `check_every` secondes.
"""
import json, os, threading, time, uuid
from datetime import datetime
from pathlib import Path

import requests

import kraken
from bot import WATCH, ema_series, rsi_series

ROOT = Path(__file__).parent
CONFIG_FILE, STATE_FILE = ROOT / "ai_config.json", ROOT / "ai_state.json"
API_URL = "https://api.anthropic.com/v1/messages"

STRATEGIES = {
    "rsi_reversion": "Mean-reversion RSI : achat d'un creux (RSI bas, prix sous la bande de Bollinger basse), sortie au rebond.",
    "trend_follow": "Suivi de tendance : EMA20 > EMA50 avec écart qui s'élargit ou croisement haussier récent, stop suiveur.",
    "breakout": "Cassure : prix qui dépasse le plus haut des 20 dernières bougies avec volatilité en hausse.",
    "momentum": "Momentum : actif le plus fort sur 6/24 bougies, tant que le RSI n'est pas extrême (>80).",
    "bollinger": "Bollinger : retour vers la moyenne depuis la bande basse (%B < 0.1) quand la tendance de fond n'est pas fortement baissière.",
}
PROFILES = {   # garde-fous dépendant de l'agressivité
    "prudent":   {"min_conf": 0.75, "size_max": 0.6, "sl_max": 3.0,  "desc": "très sélectif, n'agit que sur des signaux forts et clairs, préfère ne rien faire, petites positions, stops serrés"},
    "equilibre": {"min_conf": 0.60, "size_max": 1.0, "sl_max": 6.0,  "desc": "équilibré, agit sur des signaux solides avec un bon rapport gain/risque"},
    "agressif":  {"min_conf": 0.45, "size_max": 1.5, "sl_max": 10.0, "desc": "opportuniste, accepte des signaux plus incertains et des positions plus grosses, stops plus larges"},
}
DEFAULT_CONFIG = {
    "mode": "paper",                 # paper | live
    "model": "claude-sonnet-5-5",
    "timeframe": 60,                 # bougies analysées (minutes) : 15 | 60 | 240 | 1440
    "interval_min": 30,              # minutes entre deux analyses de Claude
    "check_every": 30,               # secondes entre deux contrôles locaux des stops
    "max_positions": 3,              # 1 à 5 trades en parallèle
    "aggressiveness": "equilibre",
    "strategies": list(STRATEGIES),
    "pairs": [p for p, _ in WATCH],
    "order_size": 50.0,              # montant de base par trade (stablecoin)
    "budget": 1000.0,                # capital alloué à l'IA (paper : cash de départ)
    "max_exposure_pct": 60.0,        # % max du budget investi en même temps
    "max_daily_loss_pct": 5.0,       # au-delà, plus aucune nouvelle ouverture jusqu'à demain
    "max_calls_per_day": 100,        # plafond d'appels à l'API Claude par jour
    "fee_pct": 0.26,
    "notes": "",                     # consignes libres ajoutées au prompt
}
LIMITS = {"timeframe": (15, 1440), "interval_min": (5, 720), "check_every": (10, 600), "max_positions": (1, 5),
          "order_size": (5, 100000), "budget": (10, 10000000), "max_exposure_pct": (5, 100),
          "max_daily_loss_pct": (0.5, 50), "max_calls_per_day": (1, 1000), "fee_pct": (0, 2)}
TFS = (15, 60, 240, 1440)
LABELS = dict(WATCH)

DECIDE_TOOL = {
    "name": "decide",
    "description": "Rends ta décision pour ce cycle. Liste vide = ne rien faire.",
    "input_schema": {
        "type": "object",
        "properties": {
            "market_view": {"type": "string", "description": "Lecture du marché en 1-2 phrases."},
            "actions": {"type": "array", "items": {"type": "object", "properties": {
                "type": {"type": "string", "enum": ["open", "close", "adjust"]},
                "pair": {"type": "string", "description": "Altname Kraken, ex. XBTUSDC"},
                "strategy": {"type": "string", "description": "open : une des stratégies autorisées"},
                "confidence": {"type": "number", "description": "open : 0 à 1"},
                "size_factor": {"type": "number", "description": "open : multiplicateur du montant de base (0.25 à 1.5)"},
                "stop_loss_pct": {"type": "number", "description": "open/adjust : perte max en % (obligatoire à l'ouverture)"},
                "take_profit_pct": {"type": "number", "description": "open/adjust : objectif en % (0 = aucun)"},
                "trailing_pct": {"type": "number", "description": "open/adjust : stop suiveur en % (0 = aucun)"},
                "reason": {"type": "string", "description": "Justification courte, chiffrée."},
            }, "required": ["type", "pair", "reason"]}},
        },
        "required": ["market_view", "actions"],
    },
}


def _bollinger_b(closes, n=20):
    if len(closes) < n:
        return None
    w = closes[-n:]
    m = sum(w) / n
    sd = (sum((x - m) ** 2 for x in w) / n) ** 0.5
    return None if sd == 0 else (closes[-1] - (m - 2 * sd)) / (4 * sd)


def market_snapshot(tf, pairs):
    """Indicateurs condensés par paire (valeurs numériques uniquement)."""
    rows = []
    for pair in pairs:
        try:
            t = next(iter(kraken.public("Ticker", pair=pair).values()))
            price, open24 = float(t["c"][0]), float(t["o"])
            candles = kraken.ohlc(pair, tf)[:-1]
            cl = [c[4] for c in candles]
            hi, lo = [c[2] for c in candles], [c[3] for c in candles]
            r = (rsi_series(cl, 14) or [None])[-1]
            f, s = ema_series(cl, 20), ema_series(cl, 50)
            gap = (f[-1] / s[-1] - 1) * 100 if f[-1] and s[-1] else None
            prev_gap = (f[-2] / s[-2] - 1) * 100 if len(cl) > 2 and f[-2] and s[-2] else None
            last = candles[-30:]
            rows.append({
                "pair": pair, "price": price, "chg24h_pct": round((price / open24 - 1) * 100, 2),
                "rsi14": None if r is None else round(r, 1),
                "ema20_vs_ema50_pct": None if gap is None else round(gap, 2),
                "ema_gap_prev_pct": None if prev_gap is None else round(prev_gap, 2),
                "bollinger_pctB": None if _bollinger_b(cl) is None else round(_bollinger_b(cl), 2),
                "vs_20bar_high_pct": round((price / max(hi[-20:]) - 1) * 100, 2),
                "vs_20bar_low_pct": round((price / min(lo[-20:]) - 1) * 100, 2),
                "ret_6bars_pct": round((cl[-1] / cl[-7] - 1) * 100, 2) if len(cl) > 7 else None,
                "ret_24bars_pct": round((cl[-1] / cl[-25] - 1) * 100, 2) if len(cl) > 25 else None,
                "avg_range_pct": round(sum((c[2] - c[3]) / c[4] for c in last) / len(last) * 100, 2),
            })
        except Exception as e:
            rows.append({"pair": pair, "error": str(e)[:60]})
        time.sleep(0.35)
    return rows


class AIBot:
    def __init__(self):
        self.lock = threading.Lock()
        self.tlock = threading.RLock()
        self.running = False
        self.thread = None
        self.logs = []
        self.prices = {}
        self.last_review = 0.0
        self.reviewing = False
        self.config = {**DEFAULT_CONFIG, **self._load(CONFIG_FILE, {})}
        self.state = self._load(STATE_FILE, None) or self._fresh_state()

    # ---------- persistance ----------
    @staticmethod
    def _load(path, default):
        try:
            return json.loads(path.read_text())
        except Exception:
            return default

    def _fresh_state(self):
        return {"cash": self.config["budget"], "positions": [], "trades": [], "pnl": 0.0, "decisions": [],
                "usage": {"day": "", "calls": 0, "in": 0, "out": 0}, "day": "", "day_pnl": 0.0}

    def _save(self):
        STATE_FILE.write_text(json.dumps(self.state, indent=1))

    def log(self, msg):
        self.logs = (self.logs + [f"{datetime.now():%H:%M:%S}  {msg}"])[-100:]

    def update_config(self, new):
        with self.tlock, self.lock:
            c = dict(self.config)
            for k in DEFAULT_CONFIG:
                if k in (new or {}):
                    c[k] = new[k]
            if c["mode"] not in ("paper", "live"):
                raise ValueError("mode invalide")
            if c["mode"] != self.config["mode"] and (self.running or self.state["positions"]):
                raise ValueError("Changement de mode impossible : arrête le bot IA et ferme les positions")
            if c["aggressiveness"] not in PROFILES:
                raise ValueError("agressivité invalide")
            if not str(c["model"]).strip():
                raise ValueError("modèle manquant")
            c["model"] = str(c["model"]).strip()
            c["notes"] = str(c["notes"])[:500]
            for k, (lo, hi) in LIMITS.items():
                c[k] = float(c[k]) if k in ("order_size", "budget", "max_exposure_pct", "max_daily_loss_pct", "fee_pct") else int(c[k])
                if not lo <= c[k] <= hi:
                    raise ValueError(f"{k} doit être entre {lo} et {hi}")
            if c["timeframe"] not in TFS:
                raise ValueError("timeframe invalide")
            c["strategies"] = [s for s in c["strategies"] if s in STRATEGIES]
            c["pairs"] = [p for p in c["pairs"] if p in LABELS]
            if not c["strategies"] or not c["pairs"]:
                raise ValueError("Choisis au moins une stratégie et une paire")
            if c["order_size"] > c["budget"]:
                raise ValueError("Le montant par trade dépasse le budget")
            self.config = c
            CONFIG_FILE.write_text(json.dumps(c, indent=1))
        self.log("Réglages IA enregistrés")

    def reset_paper(self):
        with self.tlock, self.lock:
            if self.config["mode"] == "live" and self.state["positions"]:
                raise ValueError("Positions live ouvertes : ferme-les d'abord")
            self.state = self._fresh_state(); self._save()
        self.log("Portefeuille IA réinitialisé")

    # ---------- boucle ----------
    def start(self):
        if self.running:
            return
        self.running = True
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
            for _ in range(int(self.config["check_every"])):
                if not self.running:
                    return
                time.sleep(1)

    def analyze_now(self):
        """Déclenche une analyse immédiate (même si le bot est arrêté : propose et exécute selon les règles)."""
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
        today = datetime.now().strftime("%Y-%m-%d")
        if self.state["day"] != today:
            self.state["day"], self.state["day_pnl"] = today, 0.0
        u = self.state["usage"]
        if u["day"] != today:
            u.update(day=today, calls=0, **{"in": 0, "out": 0})

    def _monitor(self):
        self._day_rollover()
        for p in list(self.state["positions"]):
            try:
                price = kraken.last_price(p["pair"])
            except Exception as e:
                self.log(f"Prix {p['pair']} indisponible: {e}")
                continue
            self.prices[p["pair"]] = price
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

    # ---------- analyse par Claude ----------
    def _equity(self):
        s = self.state
        return s["cash"] + sum(p["qty"] * self.prices.get(p["pair"], p["entry"]) for p in s["positions"])

    def _build_prompt(self, rows):
        c, s = self.config, self.state
        prof = PROFILES[c["aggressiveness"]]
        pos = []
        for p in s["positions"]:
            px = self.prices.get(p["pair"], p["entry"])
            pos.append({"pair": p["pair"], "strategy": p["strategy"], "entry": p["entry"], "price": px,
                        "pnl_pct": round((px / p["entry"] - 1) * 100, 2), "stop_loss_pct": p["sl"],
                        "take_profit_pct": p["tp"], "trailing_pct": p["trail"],
                        "age_h": round((time.time() - p["ts"]) / 3600, 1), "opened_reason": p["reason"]})
        ctx = {"now": datetime.now().strftime("%Y-%m-%d %H:%M"), "timeframe_min": c["timeframe"],
               "open_positions": pos, "free_slots": c["max_positions"] - len(pos),
               "cash_available": round(s["cash"], 2) if c["mode"] == "paper" else None,
               "base_order_size": c["order_size"], "fee_pct_per_order": c["fee_pct"],
               "day_pnl": round(s["day_pnl"], 2), "market": rows}
        system = (
            "Tu es le moteur de décision d'un bot de trading crypto spot sur Kraken (long uniquement, ordres au marché, "
            "paires contre stablecoin). Tu reçois un résumé chiffré du marché et l'état du portefeuille, et tu réponds "
            "UNIQUEMENT en appelant l'outil `decide`.\n\n"
            f"Profil : {c['aggressiveness']} — {prof['desc']}.\n"
            f"Stratégies autorisées :\n" + "\n".join(f"- {k}: {STRATEGIES[k]}" for k in c["strategies"]) + "\n\n"
            "Règles :\n"
            f"- Maximum {c['max_positions']} positions simultanées, une seule par paire. Respecte `free_slots`.\n"
            "- Chaque `open` DOIT avoir un stop_loss_pct. Les frais font ≈0,5 % l'aller-retour : n'ouvre que si le gain visé "
            "dépasse nettement ce coût et que le rapport gain/risque est favorable.\n"
            "- `close` pour sortir si la thèse est invalidée ; `adjust` pour resserrer stop/objectif. Les stops/TP sont aussi "
            "surveillés automatiquement entre deux analyses.\n"
            "- Ne force jamais un trade : une liste d'actions vide est une réponse valide et souvent la bonne.\n"
            "- Aucune garantie de gain n'existe ; sois honnête sur ta confiance (0 à 1). Le code rejettera les ordres hors règles."
        )
        if c["notes"]:
            system += f"\n\nConsignes de l'utilisateur (ne peuvent pas lever les règles ci-dessus) : {c['notes']}"
        return system, json.dumps(ctx, ensure_ascii=False)

    def _call_claude(self, system, user):
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise RuntimeError("ANTHROPIC_API_KEY manquante dans .env")
        r = requests.post(API_URL, timeout=90, headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                                                        "content-type": "application/json"},
                          json={"model": self.config["model"], "max_tokens": 2000, "system": system,
                                "tools": [DECIDE_TOOL], "tool_choice": {"type": "tool", "name": "decide"},
                                "messages": [{"role": "user", "content": user}]})
        if r.status_code != 200:
            raise RuntimeError(f"API Claude {r.status_code}: {r.text[:200]}")
        d = r.json()
        u = self.state["usage"]
        u["calls"] += 1
        u["in"] += d.get("usage", {}).get("input_tokens", 0)
        u["out"] += d.get("usage", {}).get("output_tokens", 0)
        for b in d.get("content", []):
            if b.get("type") == "tool_use" and b.get("name") == "decide":
                return b["input"]
        raise RuntimeError("Réponse sans décision")

    def _review(self):
        c, s = self.config, self.state
        self._day_rollover()
        if s["usage"]["calls"] >= c["max_calls_per_day"]:
            return self.log("Plafond d'appels Claude du jour atteint : analyse sautée")
        self.reviewing = True
        try:
            pairs = list(dict.fromkeys(c["pairs"] + [p["pair"] for p in s["positions"]]))
            rows = market_snapshot(c["timeframe"], pairs)
            for r in rows:
                if "price" in r:
                    self.prices[r["pair"]] = r["price"]
            system, user = self._build_prompt([r for r in rows if "error" not in r])
            out = self._call_claude(system, user)
            results = [self._apply(a) for a in out.get("actions", [])[:10]]
            s["decisions"] = (s["decisions"] + [{
                "time": datetime.now().strftime("%d/%m %H:%M"), "view": str(out.get("market_view", ""))[:600],
                "actions": results, "mode": c["mode"]}])[-40:]
            self.log(f"Analyse Claude : {len(results)} action(s) proposée(s)")
        except Exception as e:
            s["decisions"] = (s["decisions"] + [{"time": datetime.now().strftime("%d/%m %H:%M"), "view": "", "mode": c["mode"],
                                                 "actions": [{"text": "Erreur : " + str(e)[:300], "ok": False}]}])[-40:]
            self.log(f"ERREUR analyse: {e}")
        finally:
            self.reviewing = False
            self._save()

    # ---------- garde-fous + exécution ----------
    def _apply(self, a):
        c, s = self.config, self.state
        t, pair = a.get("type"), a.get("pair")
        pos = next((p for p in s["positions"] if p["pair"] == pair), None)
        def res(ok, txt):
            return {"ok": ok, "text": f"{t} {LABELS.get(pair, pair)} — {txt}", "reason": str(a.get("reason", ""))[:300]}
        try:
            if t == "close":
                if not pos:
                    return res(False, "aucune position sur cette paire")
                self._sell(pos, kraken.last_price(pair), "IA : " + str(a.get("reason", ""))[:120])
                return res(True, "fermée")
            if t == "adjust":
                if not pos:
                    return res(False, "aucune position sur cette paire")
                sl_max = PROFILES[c["aggressiveness"]]["sl_max"]
                for k, f in (("sl", "stop_loss_pct"), ("tp", "take_profit_pct"), ("trail", "trailing_pct")):
                    if a.get(f) is not None:
                        pos[k] = min(max(float(a[f]), 0), sl_max if k != "tp" else 100)
                if not pos["sl"]:
                    pos["sl"] = sl_max
                return res(True, f"SL {pos['sl']}% · TP {pos['tp']}% · suiveur {pos['trail']}%")
            if t != "open":
                return res(False, "type inconnu")
            prof = PROFILES[c["aggressiveness"]]
            conf, strat = float(a.get("confidence", 0)), a.get("strategy")
            if pair not in c["pairs"]:
                return res(False, "paire non autorisée")
            if strat not in c["strategies"]:
                return res(False, "stratégie non autorisée")
            if pos:
                return res(False, "position déjà ouverte")
            if len(s["positions"]) >= c["max_positions"]:
                return res(False, "nombre max de positions atteint")
            if conf < prof["min_conf"]:
                return res(False, f"confiance {conf:.2f} < minimum {prof['min_conf']} ({c['aggressiveness']})")
            if s["day_pnl"] <= -c["budget"] * c["max_daily_loss_pct"] / 100:
                return res(False, "perte journalière max atteinte")
            sl = float(a.get("stop_loss_pct") or 0)
            if sl <= 0:
                return res(False, "stop loss obligatoire")
            sl = min(max(sl, 0.5), prof["sl_max"])
            size = c["order_size"] * min(max(float(a.get("size_factor", 1)), 0.25), prof["size_max"])
            invested = sum(p["cost"] for p in s["positions"])
            if invested + size > c["budget"] * c["max_exposure_pct"] / 100:
                return res(False, "exposition max atteinte")
            if c["mode"] == "paper" and s["cash"] < size:
                return res(False, "solde insuffisant")
            self._buy(pair, size, strat, sl, float(a.get("take_profit_pct") or 0), float(a.get("trailing_pct") or 0),
                      str(a.get("reason", ""))[:200], conf)
            return res(True, f"ouverte {size:.0f} (SL {sl}%)")
        except Exception as e:
            return res(False, "erreur : " + str(e)[:150])

    def _buy(self, pair, size, strat, sl, tp, trail, reason, conf):
        c, s = self.config, self.state
        price = kraken.last_price(pair)
        qty = size * (1 - c["fee_pct"] / 100) / price
        if c["mode"] == "paper":
            s["cash"] -= size
        else:
            kraken.market_order(pair, "buy", size / price)
        p = {"id": uuid.uuid4().hex[:8], "pair": pair, "strategy": strat, "qty": qty, "entry": price, "cost": size,
             "peak": price, "sl": sl, "tp": min(tp, 100), "trail": min(trail, 50), "reason": reason, "conf": conf,
             "ts": int(time.time()), "opened": datetime.now().strftime("%d/%m %H:%M")}
        s["positions"].append(p)
        self.prices[pair] = price
        self._record("BUY", p, price, 0, reason)

    def _sell(self, p, price, why):
        c, s = self.config, self.state
        if c["mode"] == "live":
            kraken.market_order(p["pair"], "sell", p["qty"])
        proceeds = p["qty"] * price * (1 - c["fee_pct"] / 100)
        pnl = proceeds - p["cost"]
        if c["mode"] == "paper":
            s["cash"] += proceeds
        s["positions"] = [x for x in s["positions"] if x["id"] != p["id"]]
        s["pnl"] += pnl
        s["day_pnl"] += pnl
        self._record("SELL", p, price, pnl, why)

    def _record(self, side, p, price, pnl, why):
        t = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": self.config["mode"], "side": side,
             "pair": p["pair"], "strategy": p["strategy"], "price": price, "qty": p["qty"], "pnl": pnl, "why": why}
        self.state["trades"] = (self.state["trades"] + [t])[-300:]
        self._save()
        self.log(f"{self.config['mode'].upper()} {side} {LABELS.get(p['pair'], p['pair'])} @ {price:g} ({why})")

    def liquidate(self):
        with self.tlock:
            for p in list(self.state["positions"]):
                self._sell(p, kraken.last_price(p["pair"]), "Liquidation manuelle")

    def close_position(self, pid):
        with self.tlock:
            p = next((x for x in self.state["positions"] if x["id"] == pid), None)
            if not p:
                raise ValueError("Position introuvable")
            self._sell(p, kraken.last_price(p["pair"]), "Fermeture manuelle")

    # ---------- état pour l'UI ----------
    def snapshot(self):
        with self.lock:
            c, s = self.config, self.state
            pos = []
            for p in s["positions"]:
                px = self.prices.get(p["pair"], p["entry"])
                pos.append({**p, "label": LABELS.get(p["pair"], p["pair"]), "price": px,
                            "pnl_pct": (px / p["entry"] - 1) * 100,
                            "pnl": p["qty"] * px * (1 - c["fee_pct"] / 100) - p["cost"]})
            nxt = max(0, int(c["interval_min"] * 60 - (time.time() - self.last_review))) if self.running else None
            return {"config": c, "running": self.running, "reviewing": self.reviewing, "next_review_s": nxt,
                    "key_ok": bool(os.getenv("ANTHROPIC_API_KEY")),
                    "live_ok": bool(os.getenv("KRAKEN_API_KEY") and os.getenv("KRAKEN_API_SECRET")),
                    "cash": s["cash"], "equity": self._equity(), "pnl": s["pnl"], "day_pnl": s["day_pnl"],
                    "positions": pos, "usage": s["usage"],
                    "trades": [t for t in s["trades"] if t["mode"] == c["mode"]][-40:][::-1],
                    "decisions": s["decisions"][-15:][::-1], "logs": self.logs[-30:][::-1],
                    "options": {"strategies": STRATEGIES, "pairs": [{"pair": p, "label": l} for p, l in WATCH],
                                "profiles": {k: v["desc"] for k, v in PROFILES.items()}}}
