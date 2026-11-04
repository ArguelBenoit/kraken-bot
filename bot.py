import json, threading, time, uuid
from datetime import datetime
from pathlib import Path

import kraken

ROOT = Path(__file__).parent
CONFIG_FILE, STATE_FILE = ROOT / "config.json", ROOT / "state.json"

DEFAULT_CONFIG = {
    "pair": "XBTUSDC",          # crypto + stablecoin
    "mode": "paper",            # paper | live
    "strategy": "rsi",          # rsi (mean-reversion) | trend (suivi de tendance, croisement d'EMA)
    "timeframe": 15,            # minutes: 1,5,15,30,60,240
    "rsi_period": 14,
    "rsi_buy": 30,
    "rsi_sell": 70,
    "take_profit_pct": 2.0,
    "stop_loss_pct": 1.5,
    "order_size": 100.0,        # en stablecoin par achat
    "fee_pct": 0.26,            # frais taker Kraken (estimation)
    "ma_fast": 20,              # trend : EMA rapide (en bougies)
    "ma_slow": 50,              # trend : EMA lente
    "instant_entry": 0,         # trend : 1 = achète tout de suite si EMA rapide > lente (sans attendre un croisement)
    "trailing_pct": 5.0,        # trend : stop suiveur depuis le plus haut (0 = désactivé)
    "check_every": 30,          # secondes entre deux analyses
    "paper_balance": 1000.0,    # capital de départ du paper trading
}
PIN_FIELDS = ["pair", "timeframe", "rsi_period", "rsi_buy", "rsi_sell", "take_profit_pct",
              "stop_loss_pct", "order_size", "fee_pct", "check_every", "strategy", "ma_fast", "ma_slow", "trailing_pct", "instant_entry"]
LIMITS = {"order_size": (5, 100000), "rsi_period": (2, 100), "rsi_buy": (1, 50), "rsi_sell": (50, 99),
          "take_profit_pct": (0.1, 50), "stop_loss_pct": (0.1, 50), "check_every": (10, 3600),
          "ma_fast": (2, 200), "ma_slow": (5, 400), "trailing_pct": (0, 50)}
STRATEGIES = ("rsi", "trend")


def rsi(closes, n):
    if len(closes) <= n:
        return None
    gains = losses = 0.0
    for i in range(1, n + 1):
        d = closes[i] - closes[i - 1]
        gains += max(d, 0); losses += max(-d, 0)
    ag, al = gains / n, losses / n
    for i in range(n + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        ag = (ag * (n - 1) + max(d, 0)) / n
        al = (al * (n - 1) + max(-d, 0)) / n
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)


WATCH = [("ETHUSDC","ETH/USDC"),("XBTUSDC","BTC/USDC"),("SOLUSDC","SOL/USDC"),("XRPUSDC","XRP/USDC"),
         ("AVAXUSDC","AVAX/USDC"),("LINKUSDC","LINK/USDC"),("ADAUSDC","ADA/USDC"),("DOTUSDC","DOT/USDC"),
         ("XDGUSDC","DOGE/USDC"),("SHIBUSDC","SHIB/USDC"),("TONUSDC","TON/USDC"),("LTCUSDC","LTC/USDC")]
_scan_cache = {}
_pair_keys = {}


def scan(tf, period, fast=20, slow=50):
    """Tableau comparatif des paires pour un timeframe (cache 60 s)."""
    hit = _scan_cache.get((tf, period, fast, slow))
    if hit and time.time() - hit[0] < 60:
        return hit[1]
    if not _pair_keys:
        for k, v in kraken.public("AssetPairs").items():
            _pair_keys[v["altname"]] = k
    tick = kraken.public("Ticker", pair=",".join(p for p, _ in WATCH))
    rows = []
    for pair, label in WATCH:
        try:
            t = tick[_pair_keys[pair]]
            price, open_, vol = float(t["c"][0]), float(t["o"]), float(t["v"][1]) * float(t["p"][1])
            candles = kraken.ohlc(pair, tf)[:-1]
            closes = [c[4] for c in candles]
            r = (rsi_series(closes, period) or [None])[-1]
            last = candles[-30:]
            volat = sum((c[2] - c[3]) / c[4] for c in last) / len(last) * 100
            ts = trend_state(closes, fast, slow)
            rows.append({"pair": pair, "label": label, "price": price, "chg24": (price / open_ - 1) * 100,
                         "vol24": vol, "rsi": r, "volat": volat,
                         "trend_gap": (ts[0] / ts[1] - 1) * 100 if ts else None, "trend_cross": bool(ts and ts[2])})
        except Exception:
            rows.append({"pair": pair, "label": label, "error": True})
        time.sleep(0.4)
    _scan_cache[(tf, period, fast, slow)] = (time.time(), rows)
    return rows


def ema_series(closes, n):
    """EMA de période n ; None tant que n bougies ne sont pas disponibles (amorcée par la moyenne simple)."""
    out = [None] * len(closes)
    if len(closes) < n:
        return out
    e = sum(closes[:n]) / n
    out[n - 1] = e
    k = 2 / (n + 1)
    for i in range(n, len(closes)):
        e = closes[i] * k + e * (1 - k)
        out[i] = e
    return out


def trend_state(closes, fast, slow):
    """(ema_rapide, ema_lente, croisement_haussier_sur_la_dernière_bougie) ; None si pas assez de données."""
    f, sl = ema_series(closes, fast), ema_series(closes, slow)
    if len(closes) < 2 or sl[-2] is None or sl[-1] is None:
        return None
    return f[-1], sl[-1], (f[-2] <= sl[-2] and f[-1] > sl[-1])


def rsi_series(closes, n):
    """RSI (lissage de Wilder) pour chaque bougie ; None tant que les données manquent."""
    out = [None] * len(closes)
    if len(closes) <= n:
        return out
    ag = sum(max(closes[i] - closes[i-1], 0) for i in range(1, n + 1)) / n
    al = sum(max(closes[i-1] - closes[i], 0) for i in range(1, n + 1)) / n
    for i in range(n, len(closes)):
        if i > n:
            d = closes[i] - closes[i-1]
            ag = (ag * (n - 1) + max(d, 0)) / n
            al = (al * (n - 1) + max(-d, 0)) / n
        out[i] = 100.0 if al == 0 else 100 - 100 / (1 + ag / al)
    return out


class Bot:
    def __init__(self):
        self.lock = threading.Lock()
        self.tlock = threading.RLock()   # un seul ordre / cycle à la fois
        self.running = False
        self.thread = None
        self.logs = []
        self.config = {**DEFAULT_CONFIG, **self._load(CONFIG_FILE, {})}
        self.state = self._load(STATE_FILE, None) or self._fresh_state()
        self.state.setdefault("presets", [])
        if self.state.get("qty", 0) > 0 and not self.state.get("pair"):
            self.state["pair"] = self.config["pair"]      # anciennes positions sans paire mémorisée
        self.last = {"price": None, "rsi": None, "time": None}

    # ---------- persistance ----------
    @staticmethod
    def _load(path, default):
        try:
            return json.loads(path.read_text())
        except Exception:
            return default

    def _fresh_state(self):
        presets = getattr(self, "state", {}).get("presets", [])   # les configs épinglées survivent au reset
        return {"cash": self.config["paper_balance"], "qty": 0.0, "entry": None, "trades": [], "pnl": 0.0,
                "presets": presets}

    def _save(self):
        STATE_FILE.write_text(json.dumps(self.state, indent=1))

    def log(self, msg):
        self.logs.append(f"{datetime.now():%H:%M:%S}  {msg}")
        self.logs = self.logs[-100:]

    # ---------- config ----------
    def update_config(self, new):
        cfg = dict(self.config)
        for k, default in DEFAULT_CONFIG.items():
            if k in new:
                v = new[k]
                cfg[k] = str(v).strip().upper() if k == "pair" else (str(v).strip().lower() if k == "strategy" else (v if k == "mode" else type(default)(v)))
        if cfg["strategy"] not in STRATEGIES:
            raise ValueError("méthode invalide")
        if cfg["ma_fast"] >= cfg["ma_slow"]:
            raise ValueError("ma_fast doit être < ma_slow")
        if cfg["mode"] not in ("paper", "live"):
            raise ValueError("mode invalide")
        if cfg["mode"] != self.config["mode"] and (self.running or self.state.get("qty")):
            raise ValueError("Impossible de changer de mode : arrête le bot et ferme la position ouverte d'abord")
        for k, (lo, hi) in LIMITS.items():
            if not lo <= cfg[k] <= hi:
                raise ValueError(f"{k} doit être entre {lo} et {hi}")
        if cfg["rsi_buy"] >= cfg["rsi_sell"]:
            raise ValueError("rsi_buy doit être < rsi_sell")
        with self.lock:
            self.config = cfg
            CONFIG_FILE.write_text(json.dumps(cfg, indent=1))
        self.log("Configuration enregistrée")

    def pin_preset(self, name):
        """Épingle la configuration actuellement ENREGISTRÉE sous un nom."""
        name = (name or "").strip()
        if not 1 <= len(name) <= 40:
            raise ValueError("Nom requis (40 caractères max)")
        with self.lock:
            presets = self.state.setdefault("presets", [])
            if any(p["name"].lower() == name.lower() for p in presets):
                raise ValueError("Ce nom existe déjà")
            if len(presets) >= 50:
                raise ValueError("50 configs maximum")
            presets.append({"id": uuid.uuid4().hex[:8], "name": name,
                            "created": datetime.now().strftime("%d/%m/%Y"),
                            "config": {k: self.config[k] for k in PIN_FIELDS}})
            self._save()
        self.log(f"Config épinglée : {name}")

    def unpin_preset(self, pid):
        with self.lock:
            presets = self.state.setdefault("presets", [])
            n = len(presets)
            self.state["presets"] = [p for p in presets if p["id"] != pid]
            if len(self.state["presets"]) == n:
                raise ValueError("Config introuvable")
            self._save()
        self.log("Config épinglée supprimée")

    def reset_paper(self):
        with self.tlock, self.lock:      # attend la fin d'un cycle éventuel en cours
            self.state = self._fresh_state(); self._save()
        self.log("Portefeuille paper réinitialisé")

    # ---------- boucle ----------
    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        self.log(f"Bot démarré en mode {self.config['mode'].upper()}")

    def stop(self):
        if self.running:
            self.running = False
            self.log("Bot arrêté (la position éventuelle reste ouverte)")

    def _loop(self):
        while self.running:
            try:
                self.tick()
            except Exception as e:
                self.log(f"ERREUR: {e}")
            for _ in range(int(self.config["check_every"])):
                if not self.running:
                    return
                time.sleep(1)

    def tick(self):
        with self.tlock:
            self._tick()

    def liquidate(self):
        """Vend toute la position au marché, tout de suite."""
        with self.tlock:
            s = self.state
            if s["qty"] <= 0:
                raise ValueError("Aucune position ouverte")
            pair = s.get("pair") or self.config["pair"]
            price = kraken.last_price(pair)
            self._sell(price, "liquidation manuelle")

    def _tick(self):
        c = self.config
        # une position ouverte est suivie sur sa propre paire, même si la paire des réglages a changé
        pair = (self.state.get("pair") or c["pair"]) if self.state["qty"] > 0 else c["pair"]
        if c["strategy"] == "trend":
            return self._tick_trend(pair)
        closes = kraken.candles(pair, c["timeframe"])
        price = kraken.last_price(pair)
        r = rsi(closes, c["rsi_period"])
        self.last = {"price": price, "rsi": r, "time": datetime.now().strftime("%H:%M:%S")}
        if r is None:
            return self.log("Pas assez de données pour le RSI")
        s = self.state
        if s["qty"] == 0:
            if r <= c["rsi_buy"]:
                self._buy(price, f"RSI {r:.1f} <= {c['rsi_buy']}")
        else:
            chg = (price / s["entry"] - 1) * 100
            if chg >= c["take_profit_pct"]:
                self._sell(price, f"take profit {chg:+.2f}%")
            elif chg <= -c["stop_loss_pct"]:
                self._sell(price, f"stop loss {chg:+.2f}%")
            elif r >= c["rsi_sell"]:
                self._sell(price, f"RSI {r:.1f} >= {c['rsi_sell']}")

    def _tick_trend(self, pair):
        """Suivi de tendance : achat sur croisement haussier EMA rapide/lente (bougie close), sortie sur
        croisement baissier, stop loss fixe ou stop suiveur. Pas de take profit : on laisse courir."""
        c, s = self.config, self.state
        rows = kraken.ohlc(pair, c["timeframe"])[:-1]          # bougies closes
        closes = [r[4] for r in rows]
        price = kraken.last_price(pair)
        ts = trend_state(closes, c["ma_fast"], c["ma_slow"])
        self.last = {"price": price, "rsi": None, "time": datetime.now().strftime("%H:%M:%S")}
        if ts is None:
            return self.log("Pas assez de données pour les moyennes mobiles")
        fast, slow, cross = ts
        candle = rows[-1][0]
        if s["qty"] == 0:
            # une seule entrée par bougie : pas de rachat immédiat après une sortie sur la même bougie
            if (cross or (c.get("instant_entry") and fast > slow)) and s.get("trend_block") != candle:
                self._buy(price, f"{'croisement' if cross else 'tendance haussière'} EMA{c['ma_fast']} > EMA{c['ma_slow']}")
        else:
            s["peak"] = max(s.get("peak") or s["entry"], price)
            chg = (price / s["entry"] - 1) * 100
            reason = None
            if chg <= -c["stop_loss_pct"]:
                reason = f"stop loss {chg:+.2f}%"
            elif c["trailing_pct"] > 0 and price <= s["peak"] * (1 - c["trailing_pct"] / 100):
                reason = f"stop suiveur −{c['trailing_pct']}% depuis le pic ({chg:+.2f}%)"
            elif fast < slow:
                reason = f"croisement baissier EMA{c['ma_fast']} < EMA{c['ma_slow']} ({chg:+.2f}%)"
            if reason:
                s["trend_block"] = candle
                self._sell(price, reason)
            else:
                self._save()

    # ---------- ordres ----------
    def _buy(self, price, why):
        c, s = self.config, self.state
        size = c["order_size"]
        if c["mode"] == "paper":
            if s["cash"] < size:
                return self.log("Solde paper insuffisant")
            qty = size * (1 - c["fee_pct"] / 100) / price
            s["cash"] -= size
        else:
            qty = size / price
            kraken.market_order(c["pair"], "buy", qty)
            qty *= 1 - c["fee_pct"] / 100
        s["qty"], s["entry"], s["pair"], s["cost"], s["peak"] = qty, price, c["pair"], size, price
        self._record("BUY", price, qty, why, 0)

    def _sell(self, price, why):
        c, s = self.config, self.state
        qty = s["qty"]
        if c["mode"] == "live":
            kraken.market_order(s.get("pair") or c["pair"], "sell", qty)
        proceeds = qty * price * (1 - c["fee_pct"] / 100)
        pnl = proceeds - qty * s["entry"]
        if c["mode"] == "paper":
            s["cash"] += proceeds
        s["qty"], s["entry"] = 0.0, None
        s["pnl"] += pnl
        self._record("SELL", price, qty, why, pnl)

    def _record(self, side, price, qty, why, pnl):
        t = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": self.config["mode"], "side": side,
             "price": price, "qty": qty, "pnl": pnl, "why": why,
             "ts": int(time.time()), "pair": self.state.get("pair") or self.config["pair"]}
        self.state["trades"] = (self.state["trades"] + [t])[-200:]
        self._save()
        self.log(f"{self.config['mode'].upper()} {side} {qty:.6f} @ {price:.2f} ({why})")

    def chart(self, pair=None, tf=None):
        c = self.config
        pair = pair or c["pair"]; tf = int(tf or c["timeframe"])
        rows = kraken.ohlc(pair, tf)
        rs = rsi_series([r[4] for r in rows], c["rsi_period"])
        t0 = rows[0][0]
        marks = [{"time": t["ts"], "side": t["side"]} for t in self.state["trades"]
                 if t.get("ts", 0) >= t0 and t.get("pair") == pair]
        cl = [r[4] for r in rows]
        ma = {}
        if c["strategy"] == "trend":
            for name, n in (("fast", c["ma_fast"]), ("slow", c["ma_slow"])):
                ma[name] = [{"time": r[0], "value": v} for r, v in zip(rows, ema_series(cl, n)) if v is not None]
        return {"strategy": c["strategy"], "ma": ma, "ma_fast": c["ma_fast"], "ma_slow": c["ma_slow"],
                "candles": [{"time": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4]} for r in rows],
                "rsi": [{"time": r[0], "value": v} for r, v in zip(rows, rs) if v is not None],
                "pair": pair, "tf": tf, "marks": marks, "rsi_buy": c["rsi_buy"], "rsi_sell": c["rsi_sell"]}

    def _position_price(self):
        """Prix actuel de la paire de la position (cache 5 s), même si le bot est arrêté."""
        s = self.state
        if s["qty"] <= 0:
            return None
        pair = s.get("pair") or self.config["pair"]
        ts, px, pp = getattr(self, "_pp", (0, None, None))
        if pp != pair or time.time() - ts > 5:
            try:
                px = kraken.last_price(pair)
            except Exception:
                pass
            self._pp = (time.time(), px, pair)
        return px

    def _position_rsi(self):
        """RSI de la paire de la position à la dernière bougie close (cache 60 s)."""
        s, c = self.state, self.config
        if s["qty"] <= 0:
            return None
        pair = s.get("pair") or c["pair"]
        key = (pair, c["timeframe"], c["rsi_period"])
        ts, val, k = getattr(self, "_pr", (0, None, None))
        if k != key or time.time() - ts > 60:
            try:
                val = rsi(kraken.candles(pair, c["timeframe"]), c["rsi_period"])
            except Exception:
                pass
            self._pr = (time.time(), val, key)
        return val

    def _position_ma(self):
        """EMA rapide / lente de la paire de la position (cache 60 s), méthode tendance seulement."""
        s, c = self.state, self.config
        if s["qty"] <= 0 or c["strategy"] != "trend":
            return None
        pair = s.get("pair") or c["pair"]
        key = (pair, c["timeframe"], c["ma_fast"], c["ma_slow"])
        ts, val, k = getattr(self, "_pm", (0, None, None))
        if k != key or time.time() - ts > 60:
            try:
                t = trend_state(kraken.candles(pair, c["timeframe"]), c["ma_fast"], c["ma_slow"])
                val = {"fast": t[0], "slow": t[1]} if t else None
            except Exception:
                pass
            self._pm = (time.time(), val, key)
        return val

    def snapshot(self):
        s, c = self.state, self.config
        pos_price = self._position_price()
        value = s["qty"] * (pos_price or 0)
        return {"running": self.running, "config": c, "last": self.last,
                "state": {**s, "trades": [t for t in s["trades"] if t.get("mode") == c["mode"]][::-1][:30], "equity": s["cash"] + value, "pos_price": pos_price, "pos_rsi": self._position_rsi(), "pos_ma": self._position_ma()},
                "logs": self.logs[::-1][:40]}
