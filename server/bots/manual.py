"""Trading manuel : ordres passés à la main depuis l'interface (achat au marché ou limite), avec stop loss, take profit et
stop suiveur par position. Plusieurs positions en parallèle, sur des paires différentes ou non. Long uniquement (spot).

Comme pour les autres bots, **aucun stop n'est posé chez Kraken** : SL / TP / suiveur / ordres limites sont surveillés par ce
programme (thread `_loop`). S'il s'arrête, rien ne se déclenche. Le mode live n'a jamais été testé avec de l'argent réel.
"""
import re
import threading
import time
import uuid
from datetime import datetime

from server import settings
from server.core.journal import Journal
from server.core.storage import load_json, save_json
from server.market import kraken
from server.market.pairs import LABELS
from server.market.prices import last_price

CONFIG_FILE, STATE_FILE = settings.data_file("manual_config.json"), settings.data_file("manual_state.json")
DEFAULT_CONFIG = {
    "mode": "paper",          # paper | live
    "fee_pct": 0.26,          # frais taker Kraken (estimation)
    "paper_balance": 1000.0,  # cash de départ en paper (pris en compte au reset)
    "check_every": 10,        # secondes entre deux contrôles des stops / ordres limites
    "max_order": 500.0,       # garde-fou : montant maximum d'un ordre (stablecoin)
}
LIMITS = {"fee_pct": (0, 2), "paper_balance": (10, 10_000_000), "check_every": (5, 300), "max_order": (5, 1_000_000)}
MIN_ORDER = 5.0
PAIR_RE = re.compile(r"^[A-Z0-9]{5,12}$")


def _num(d, key, default=0.0, lo=0.0, hi=None, name=None):
    try:
        v = float(d.get(key) if d.get(key) not in (None, "") else default)
    except (TypeError, ValueError):
        raise ValueError(f"{name or key} invalide")
    if v < lo or (hi is not None and v > hi):
        raise ValueError(f"{name or key} doit être entre {lo:g} et {hi:g}" if hi is not None else f"{name or key} doit être ≥ {lo:g}")
    return v


class ManualTrader:
    def __init__(self):
        self.lock = threading.RLock()      # un seul ordre / cycle à la fois
        self.journal = Journal()
        self.log = self.journal.add
        self.config = {**DEFAULT_CONFIG, **load_json(CONFIG_FILE, {})}
        self.state = load_json(STATE_FILE) or self._fresh_state()
        threading.Thread(target=self._loop, daemon=True).start()

    # ---------- persistance ----------
    def _fresh_state(self):
        return {"cash": self.config["paper_balance"], "positions": [], "pending": [], "trades": [], "pnl": 0.0}

    def _save(self):
        save_json(STATE_FILE, self.state)

    def update_config(self, new):
        with self.lock:
            c = dict(self.config)
            for k in DEFAULT_CONFIG:
                if k in (new or {}):
                    c[k] = new[k]
            if c["mode"] not in ("paper", "live"):
                raise ValueError("mode invalide")
            if c["mode"] != self.config["mode"] and (self.state["positions"] or self.state["pending"]):
                raise ValueError("Changement de mode impossible : ferme les positions et annule les ordres en attente")
            for k, (lo, hi) in LIMITS.items():
                c[k] = int(c[k]) if k == "check_every" else float(c[k])
                if not lo <= c[k] <= hi:
                    raise ValueError(f"{k} doit être entre {lo} et {hi}")
            self.config = c
            save_json(CONFIG_FILE, c)
        self.log("Réglages du trading manuel enregistrés")

    def reset_paper(self):
        with self.lock:
            if self.config["mode"] == "live":
                raise ValueError("Reset réservé au mode paper")
            self.state = self._fresh_state()
            self._save()
        self.log("Portefeuille paper (trading manuel) réinitialisé")

    # ---------- prix ----------
    def quote(self, pair):
        pair = str(pair or "").upper()
        if not PAIR_RE.match(pair):
            raise ValueError("Paire invalide")
        return {"pair": pair, "price": last_price(pair)}

    # ---------- ordres ----------
    def place_order(self, o):
        """Ordre d'achat : `type` = market (immédiat) ou limit (achat quand le prix descend à `limit_price`)."""
        c = self.config
        pair = str(o.get("pair") or "").upper()
        if not PAIR_RE.match(pair):
            raise ValueError("Paire invalide")
        size = _num(o, "size", lo=MIN_ORDER, name="Montant")
        if size > c["max_order"]:
            raise ValueError(f"Montant supérieur au maximum autorisé ({c['max_order']:g}) — modifiable dans les réglages")
        sl = _num(o, "sl_pct", 0, 0, 50, "Stop loss")
        tp = _num(o, "tp_pct", 0, 0, 1000, "Take profit")
        trail = _num(o, "trail_pct", 0, 0, 50, "Stop suiveur")
        kind = o.get("type", "market")
        if kind not in ("market", "limit"):
            raise ValueError("Type d'ordre invalide")
        with self.lock:
            if c["mode"] == "live" and not settings.kraken_configured():
                raise ValueError("Clés Kraken absentes (.env)")
            price = last_price(pair, 0)
            if kind == "limit":
                lp = _num(o, "limit_price", lo=0.0, name="Prix limite")
                if lp <= 0:
                    raise ValueError("Prix limite requis")
                if lp >= price:
                    raise ValueError(f"Un achat limite doit être sous le prix actuel ({price:g}) ; utilise « Marché » pour acheter tout de suite")
                if c["mode"] == "paper":
                    if self.state["cash"] < size:
                        raise ValueError("Solde paper insuffisant")
                    self.state["cash"] -= size             # cash réservé jusqu'à l'exécution ou l'annulation
                self.state["pending"].append({"id": uuid.uuid4().hex[:8], "pair": pair, "size": size, "limit": lp, "sl": sl,
                                              "tp": tp, "trail": trail, "created": datetime.now().strftime("%d/%m %H:%M")})
                self._save()
                self.log(f"Ordre limite en attente : {LABELS.get(pair, pair)} {size:g} @ ≤ {lp:g}")
                return
            self._buy(pair, size, price, sl, tp, trail, "achat manuel")

    def _buy(self, pair, size, price, sl, tp, trail, why, reserved=False):
        c, s = self.config, self.state
        if c["mode"] == "paper":
            if not reserved:
                if s["cash"] < size:
                    raise ValueError("Solde paper insuffisant")
                s["cash"] -= size
            qty = size * (1 - c["fee_pct"] / 100) / price
        else:
            qty = size / price
            kraken.market_order(pair, "buy", qty)
            qty *= 1 - c["fee_pct"] / 100
        p = {"id": uuid.uuid4().hex[:8], "pair": pair, "qty": qty, "entry": price, "cost": size, "peak": price,
             "sl": sl, "tp": tp, "trail": trail, "ts": int(time.time()), "opened": datetime.now().strftime("%d/%m %H:%M")}
        s["positions"].append(p)
        self._record("BUY", p, price, qty, 0.0, why)

    def _sell(self, p, price, fraction, why):
        c, s = self.config, self.state
        qty = p["qty"] * fraction
        cost = p["cost"] * fraction
        if c["mode"] == "live":
            kraken.market_order(p["pair"], "sell", qty)
        proceeds = qty * price * (1 - c["fee_pct"] / 100)
        pnl = proceeds - cost
        if c["mode"] == "paper":
            s["cash"] += proceeds
        if fraction >= 0.9999:
            s["positions"] = [x for x in s["positions"] if x["id"] != p["id"]]
        else:
            p["qty"] -= qty
            p["cost"] -= cost
        s["pnl"] += pnl
        self._record("SELL", p, price, qty, pnl, why)

    def _record(self, side, p, price, qty, pnl, why):
        t = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": self.config["mode"], "side": side, "pair": p["pair"],
             "price": price, "qty": qty, "pnl": pnl, "why": why, "ts": int(time.time())}
        self.state["trades"] = (self.state["trades"] + [t])[-300:]
        self._save()
        self.log(f"{self.config['mode'].upper()} {side} {LABELS.get(p['pair'], p['pair'])} {qty:.6f} @ {price:g} ({why})")

    def close_position(self, pid, fraction=1.0):
        fraction = float(fraction)
        if not 0 < fraction <= 1:
            raise ValueError("Fraction invalide (0 à 1)")
        with self.lock:
            p = self._find(pid)
            self._sell(p, last_price(p["pair"], 0), fraction, "fermeture manuelle" if fraction >= 0.9999 else f"vente partielle {fraction * 100:g}%")

    def adjust_position(self, pid, d):
        with self.lock:
            p = self._find(pid)
            p["sl"] = _num(d, "sl_pct", p["sl"], 0, 50, "Stop loss")
            p["tp"] = _num(d, "tp_pct", p["tp"], 0, 1000, "Take profit")
            p["trail"] = _num(d, "trail_pct", p["trail"], 0, 50, "Stop suiveur")
            self._save()
        self.log(f"{LABELS.get(p['pair'], p['pair'])} : SL {p['sl']:g}% · TP {p['tp']:g}% · suiveur {p['trail']:g}%")

    def cancel_pending(self, oid):
        with self.lock:
            o = next((x for x in self.state["pending"] if x["id"] == oid), None)
            if not o:
                raise ValueError("Ordre introuvable")
            self.state["pending"] = [x for x in self.state["pending"] if x["id"] != oid]
            if self.config["mode"] == "paper":
                self.state["cash"] += o["size"]              # cash réservé rendu
            self._save()
        self.log(f"Ordre limite annulé : {LABELS.get(o['pair'], o['pair'])}")

    def _find(self, pid):
        p = next((x for x in self.state["positions"] if x["id"] == pid), None)
        if not p:
            raise ValueError("Position introuvable")
        return p

    # ---------- surveillance ----------
    def _loop(self):
        while True:
            time.sleep(self.config["check_every"])
            try:
                with self.lock:
                    self._check()
            except Exception as e:
                self.log(f"ERREUR: {e}")

    def _check(self):
        s = self.state
        for o in list(s["pending"]):
            try:
                price = last_price(o["pair"], 0)
            except Exception as e:
                self.log(f"Prix {o['pair']} indisponible: {e}")
                continue
            if price <= o["limit"]:
                s["pending"] = [x for x in s["pending"] if x["id"] != o["id"]]
                try:
                    self._buy(o["pair"], o["size"], price, o["sl"], o["tp"], o["trail"], f"ordre limite ≤ {o['limit']:g}", reserved=True)
                except Exception as e:
                    if self.config["mode"] == "paper":
                        s["cash"] += o["size"]
                    self.log(f"Ordre limite non exécuté : {e}")
        for p in list(s["positions"]):
            try:
                price = last_price(p["pair"], 0)
            except Exception as e:
                self.log(f"Prix {p['pair']} indisponible: {e}")
                continue
            p["peak"] = max(p["peak"], price)
            why = None
            if p["sl"] and price <= p["entry"] * (1 - p["sl"] / 100):
                why = f"stop loss −{p['sl']:g}%"
            elif p["tp"] and price >= p["entry"] * (1 + p["tp"] / 100):
                why = f"take profit +{p['tp']:g}%"
            elif p["trail"] and price <= p["peak"] * (1 - p["trail"] / 100):
                why = f"stop suiveur −{p['trail']:g}%"
            if why:
                try:
                    self._sell(p, price, 1.0, why)
                except Exception as e:
                    self.log(f"Vente automatique impossible ({p['pair']}) : {e}")
        self._save()

    # ---------- état pour l'UI ----------
    def snapshot(self, quote_pair=None):
        with self.lock:
            c, s = self.config, self.state
            fee = c["fee_pct"] / 100
            pos, unreal = [], 0.0
            for p in s["positions"]:
                try:
                    px = last_price(p["pair"])
                except Exception:
                    px = p["entry"]
                value = p["qty"] * px
                pnl = value * (1 - fee) - p["cost"]
                unreal += pnl
                pos.append({**p, "label": LABELS.get(p["pair"], p["pair"]), "price": px, "pnl": pnl,
                            "pnl_pct": (px / p["entry"] - 1) * 100, "value": value,
                            "sl_price": p["entry"] * (1 - p["sl"] / 100) if p["sl"] else None,
                            "tp_price": p["entry"] * (1 + p["tp"] / 100) if p["tp"] else None,
                            "trail_price": p["peak"] * (1 - p["trail"] / 100) if p["trail"] else None})
            reserved = sum(o["size"] for o in s["pending"]) if c["mode"] == "paper" else 0.0
            quote = None
            if quote_pair:
                try:
                    quote = self.quote(quote_pair)
                except Exception:
                    quote = None
            return {"config": c, "cash": s["cash"], "reserved": reserved, "pnl": s["pnl"], "unrealized": unreal,
                    "equity": s["cash"] + reserved + sum(p["value"] for p in pos),
                    "positions": pos, "pending": [{**o, "label": LABELS.get(o["pair"], o["pair"])} for o in s["pending"]],
                    "trades": [t for t in s["trades"] if t["mode"] == c["mode"]][-60:][::-1], "logs": self.journal.recent(40),
                    "live_ok": settings.kraken_configured(), "quote": quote}

