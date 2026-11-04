"""Bot simple : une paire, une méthode, une seule position à la fois, ordres au marché (paper ou live).

La boucle (thread) analyse le marché toutes les `check_every` secondes : signaux sur la dernière bougie CLOSE, mais stops et
objectifs évalués avec le prix courant. Aucun stop n'est posé chez Kraken : si le programme s'arrête, rien ne vend.
"""
import threading
import time
from datetime import datetime

from server import settings
from server.core.cache import memo_or_stale
from server.core.journal import Journal
from server.core.storage import load_json, save_json
from server.market import kraken, strategies
from server.market.indicators import atr, ema_series, rsi_last, rsi_series, trend_state
from server.market.prices import try_last_price
from . import config as cfgmod
from .exits import exit_reason

CONFIG_FILE, STATE_FILE = settings.data_file("config.json"), settings.data_file("state.json")
MAX_TRADES_KEPT = 200


class Bot:
    def __init__(self):
        self.lock = threading.Lock()         # protège réglages et état
        self.tlock = threading.RLock()       # un seul cycle / ordre / liquidation à la fois
        self.running = False
        self.thread = None
        self.journal = Journal()
        self.log = self.journal.add
        self._last_blocked = None            # dernier signal bloqué par le filtre (une ligne de journal par bougie)
        self.config = {**cfgmod.DEFAULT_CONFIG, **load_json(CONFIG_FILE, {})}
        self.state = load_json(STATE_FILE) or self._fresh_state()
        self.state.pop("presets", None)                                    # ancien système de presets, supprimé
        if self.has_position and not self.state.get("pair"):
            self.state["pair"] = self.config["pair"]                       # anciennes positions sans paire mémorisée

    # ---------- état ----------
    @property
    def has_position(self):
        return (self.state.get("qty") or 0) > 0

    @property
    def position_pair(self):
        """Une position ouverte est toujours suivie sur SA paire, même si la paire des réglages a changé depuis."""
        return self.state.get("pair") or self.config["pair"]

    def _fresh_state(self):
        return {"cash": self.config["paper_balance"], "qty": 0.0, "entry": None, "trades": [], "pnl": 0.0}

    def _save(self):
        save_json(STATE_FILE, self.state)

    # ---------- réglages ----------
    def validate_config(self, new):
        """Valide un réglage (sans l'enregistrer) et renvoie le réglage complet, ou lève ValueError."""
        cfg = cfgmod.merge(self.config, new)
        cfgmod.check(cfg)
        if cfg["mode"] != self.config["mode"] and (self.running or self.has_position):
            raise ValueError("Impossible de changer de mode : arrête le bot et ferme la position ouverte d'abord")
        return cfg

    def update_config(self, new):
        cfg = self.validate_config(new)
        with self.lock:
            self.config = cfg
            save_json(CONFIG_FILE, cfg)
        self.log("Configuration enregistrée")

    def reset_paper(self):
        with self.tlock, self.lock:          # attend la fin d'un cycle éventuel
            self.state = self._fresh_state()
            self._save()
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
            for _ in range(int(self.config["check_every"])):      # attente interruptible par stop()
                if not self.running:
                    return
                time.sleep(1)

    def tick(self):
        with self.tlock:
            self._tick()

    def liquidate(self):
        """Vend toute la position au marché, tout de suite."""
        with self.tlock:
            if not self.has_position:
                raise ValueError("Aucune position ouverte")
            self._sell(kraken.last_price(self.position_pair), "liquidation manuelle")

    def _tick(self):
        c, s = self.config, self.state
        pair = self.position_pair if self.has_position else c["pair"]
        rows = kraken.closed_candles(pair, c["timeframe"])
        price = kraken.last_price(pair)
        sig = strategies.signal(c["strategy"], rows, c)
        if sig["info"] == strategies.NO_DATA:
            return self.log("Pas assez de données pour cette méthode")
        candle = rows[-1][0]
        if not self.has_position:
            # une seule entrée par bougie : pas de rachat immédiat après une sortie sur la même bougie
            if sig["buy"] and s.get("trend_block") != candle and self._filter_ok(pair, rows):
                self._buy(price, f"{c['strategy']} : {sig['info']}")
            return
        s["peak"] = max(s.get("peak") or s["entry"], price)
        reason = exit_reason(c, s, price, sig)
        if reason:
            s["trend_block"] = candle
            self._sell(price, reason)
        else:
            self._save()                     # mémorise le nouveau plus haut

    def _filter_ok(self, pair, rows):
        """Filtre de tendance optionnel (cours > EMA(filter_ema) sur filter_tf). Un signal bloqué n'est journalisé qu'une fois par bougie."""
        c = self.config
        if c["filter_ema"] <= 0:
            return True
        tf = c["filter_tf"] or c["timeframe"]
        try:
            filter_rows = rows if tf == c["timeframe"] else kraken.closed_candles(pair, tf)
            ok = strategies.trend_ok(filter_rows, c["filter_ema"])
        except Exception as e:
            self.log(f"Filtre de tendance indisponible : {e}")
            return False
        if not ok:
            key = (pair, filter_rows[-1][0])
            if self._last_blocked != key:
                self._last_blocked = key
                self.log(f"Signal ignoré : filtre de tendance (cours sous l'EMA{c['filter_ema']} en {tf} min)" if ok is False
                         else "Filtre de tendance : pas assez de données")
        return bool(ok)

    # ---------- ordres ----------
    def _buy(self, price, why):
        c, s = self.config, self.state
        size = c["order_size"]
        if c["mode"] == "paper":
            if s["cash"] < size:
                return self.log("Solde paper insuffisant")
            s["cash"] -= size
            qty = size * (1 - c["fee_pct"] / 100) / price
        else:
            kraken.market_order(c["pair"], "buy", size / price)
            qty = size / price * (1 - c["fee_pct"] / 100)
        s.update(qty=qty, entry=price, pair=c["pair"], cost=size, peak=price, stop_px=self._atr_stop(price))
        self._record("BUY", price, qty, why, 0)

    def _atr_stop(self, price):
        """Prix du stop ATR de la nouvelle position (None si désactivé ou indisponible : le stop en % s'applique)."""
        c = self.config
        if c["atr_stop"] <= 0:
            return None
        try:
            a = atr(kraken.closed_candles(c["pair"], c["timeframe"]))
        except Exception as e:
            self.log(f"ATR indisponible, stop en % utilisé : {e}")
            return None
        return price - c["atr_stop"] * a if a else None

    def _sell(self, price, why):
        c, s = self.config, self.state
        qty = s["qty"]
        if c["mode"] == "live":
            kraken.market_order(self.position_pair, "sell", qty)
        proceeds = qty * price * (1 - c["fee_pct"] / 100)
        pnl = proceeds - qty * s["entry"]
        if c["mode"] == "paper":
            s["cash"] += proceeds
        s.update(qty=0.0, entry=None, stop_px=None)
        s["pnl"] += pnl
        self._record("SELL", price, qty, why, pnl)

    def _record(self, side, price, qty, why, pnl):
        mode = self.config["mode"]
        trade = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": mode, "side": side, "price": price, "qty": qty,
                 "pnl": pnl, "why": why, "ts": int(time.time()), "pair": self.position_pair}
        self.state["trades"] = (self.state["trades"] + [trade])[-MAX_TRADES_KEPT:]
        self._save()
        self.log(f"{mode.upper()} {side} {qty:.6f} @ {price:.2f} ({why})")

    # ---------- données pour l'interface ----------
    def chart(self, pair=None, tf=None):
        """Bougies, RSI, moyennes (méthode trend) et repères des trades de la paire affichée."""
        c = self.config
        pair, tf = pair or c["pair"], int(tf or c["timeframe"])
        rows = kraken.ohlc(pair, tf)
        closes = [r[4] for r in rows]
        series = lambda values: [{"time": r[0], "value": v} for r, v in zip(rows, values) if v is not None]
        averages = {}
        if c["strategy"] == "trend":
            averages = {"fast": series(ema_series(closes, c["ma_fast"])), "slow": series(ema_series(closes, c["ma_slow"]))}
        marks = [{"time": t["ts"], "side": t["side"]} for t in self.state["trades"]
                 if t.get("ts", 0) >= rows[0][0] and t.get("pair") == pair]
        return {"strategy": c["strategy"], "ma": averages, "ma_fast": c["ma_fast"], "ma_slow": c["ma_slow"],
                "candles": [{"time": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4]} for r in rows],
                "rsi": series(rsi_series(closes, c["rsi_period"])), "pair": pair, "tf": tf, "marks": marks,
                "rsi_buy": c["rsi_buy"], "rsi_sell": c["rsi_sell"]}

    def _position_closes(self):
        return [r[4] for r in kraken.closed_candles(self.position_pair, self.config["timeframe"])]

    def _position_rsi(self):
        """RSI de la paire de la position à la dernière bougie close (cache 60 s)."""
        c = self.config
        key = ("pos_rsi", self.position_pair, c["timeframe"], c["rsi_period"])
        return memo_or_stale(key, 60, lambda: rsi_last(self._position_closes(), c["rsi_period"]))

    def _position_ma(self):
        """EMA rapide / lente de la paire de la position (cache 60 s), méthode trend seulement."""
        c = self.config
        if c["strategy"] != "trend":
            return None
        def compute():
            t = trend_state(self._position_closes(), c["ma_fast"], c["ma_slow"])
            return {"fast": t[0], "slow": t[1]} if t else None
        return memo_or_stale(("pos_ma", self.position_pair, c["timeframe"], c["ma_fast"], c["ma_slow"]), 60, compute)

    def snapshot(self):
        s, c = self.state, self.config
        held = self.has_position
        price = try_last_price(self.position_pair, 5) if held else None      # prix actuel même si le bot est arrêté
        trades = [t for t in s["trades"] if t.get("mode") == c["mode"]][::-1][:30]
        return {"running": self.running, "config": c, "logs": self.journal.recent(40),
                "state": {**s, "trades": trades, "equity": s["cash"] + s["qty"] * (price or 0), "pos_price": price,
                          "pos_rsi": self._position_rsi() if held else None, "pos_ma": self._position_ma() if held else None}}
