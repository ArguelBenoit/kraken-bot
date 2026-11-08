"""Trading manuel : ordres passés à la main depuis l'interface (achat au marché ou limite, ou vente à découvert / short en marge),
avec stop loss, take profit et stop suiveur par position. Plusieurs positions en parallèle. Les calculs propres au sens d'une
position (stops, liquidation, gains) sont dans `positions.py`.

En **paper** tout est simulé et surveillé par ce programme (thread `_loop`). En **live**, le stop loss (ou, à défaut, le stop suiveur) est posé
CHEZ KRAKEN (`live.py`) : il protège la position même si ce programme s'arrête ; l'objectif, le stop suiveur d'un trade qui a aussi un stop loss
et les ordres limites restent surveillés ici. Le live n'a jamais été testé sur un compte réel ; le short live l'est encore moins
(marge Kraken non validée) : il est donc désactivé par défaut (`allow_live_short`).
"""
import threading
import time
import uuid
from datetime import datetime

from server import settings
from server.core.journal import Journal
from server.core.providers import key_set, public
from server.core.storage import load_json, save_json
from server.features import proposals
from server.market.pairs import LABELS
from server.market.prices import last_price
from . import live, positions as pos
from .manual_config import DEFAULT_CONFIG, MIN_LEVERAGE, MIN_ORDER, PAIR_RE, num, validate

CONFIG_FILE, STATE_FILE = settings.data_file("manual_config.json"), settings.data_file("manual_state.json")


class ManualTrader:
    def __init__(self):
        self.lock = threading.RLock()      # un seul ordre / cycle à la fois
        self.journal = Journal()
        self.log = self.journal.add
        self.config = {**DEFAULT_CONFIG, **{k: v for k, v in load_json(CONFIG_FILE, {}).items() if k in DEFAULT_CONFIG}}
        self.state = load_json(STATE_FILE) or self._fresh_state()
        for o in self.state["pending"]:          # ordres limites créés avant l'arrivée du short
            o.setdefault("side", "long")
            o.setdefault("leverage", 1.0)
            o.setdefault("reserve", o["size"])
        threading.Thread(target=self._loop, daemon=True).start()

    # ---------- persistance ----------
    def _fresh_state(self):
        return {"cash": self.config["paper_balance"], "positions": [], "pending": [], "trades": [], "pnl": 0.0}

    def _save(self):
        save_json(STATE_FILE, self.state)

    def update_config(self, new):
        with self.lock:
            self.config = validate(self.config, new, bool(self.state["positions"] or self.state["pending"]))
            save_json(CONFIG_FILE, self.config)
        self.log("Réglages du trading manuel enregistrés")

    def reset_paper(self):
        with self.lock:
            if self.config["mode"] == "live":
                raise ValueError("Reset réservé au mode paper")
            self.state = self._fresh_state()
            self._save()
        self.log("Portefeuille paper (trading manuel) réinitialisé")

    @property
    def shorts_allowed(self):
        """Les shorts sont-ils autorisés dans le mode courant ? (toujours en paper ; en live seulement si activés dans les réglages)"""
        return self.config["mode"] == "paper" or self.config["allow_live_short"]

    # ---------- prix ----------
    def quote(self, pair):
        pair = str(pair or "").upper()
        if not PAIR_RE.match(pair):
            raise ValueError("Paire invalide")
        return {"pair": pair, "price": last_price(pair)}

    # ---------- ordres ----------
    def _short_terms(self, o, sl):
        """Levier d'un short, après les vérifications propres à la vente à découvert (autorisation, levier, stop loss obligatoire)."""
        c = self.config
        if not self.shorts_allowed:
            raise ValueError("Short LIVE désactivé : coche « Autoriser les shorts en live » dans les réglages (marge Kraken jamais validée)")
        leverage = num(o, "leverage", MIN_LEVERAGE, MIN_LEVERAGE, c["max_leverage"], "Levier")
        if sl <= 0:
            raise ValueError("Un short exige un stop loss : sans lui, la perte n'est pas limitée")
        if sl >= pos.liq_distance_pct(leverage):
            raise ValueError(f"Stop loss trop large : à ×{leverage:g} la liquidation estimée est à +{pos.liq_distance_pct(leverage):.1f}%, "
                             "le stop doit être en dessous")
        return leverage

    def place_order(self, o):
        """Ordre d'ouverture. `side` = long (défaut) ou short ; `type` = market (immédiat) ou limit (déclenché au prix limite)."""
        c = self.config
        pair = str(o.get("pair") or "").upper()
        if not PAIR_RE.match(pair):
            raise ValueError("Paire invalide")
        side = o.get("side", "long")
        if side not in ("long", "short"):
            raise ValueError("Sens invalide")
        short = side == "short"
        size = num(o, "size", lo=MIN_ORDER, name="Montant")
        if size > c["max_order"]:
            raise ValueError(f"Montant supérieur au maximum autorisé ({c['max_order']:g}) — modifiable dans les réglages")
        sl = num(o, "sl_pct", 0, 0, 50, "Stop loss")
        tp = num(o, "tp_pct", 0, 0, 95 if short else 1000, "Take profit")
        trail = num(o, "trail_pct", 0, 0, 50, "Stop suiveur")
        kind = o.get("type", "market")
        if kind not in ("market", "limit"):
            raise ValueError("Type d'ordre invalide")
        leverage = self._short_terms(o, sl) if short else 1.0
        with self.lock:
            if c["mode"] == "live" and not settings.kraken_configured():
                raise ValueError("Clés Kraken absentes (.env)")
            price = last_price(pair, 0)
            if kind == "market":
                self._open(pair, side, size, price, sl, tp, trail, leverage, "short manuel" if short else "achat manuel")
                return
            lp = num(o, "limit_price", lo=0.0, name="Prix limite")
            if lp <= 0:
                raise ValueError("Prix limite requis")
            if short and lp <= price:
                raise ValueError(f"Un short limite doit être au-dessus du prix actuel ({price:g}) ; utilise « Marché » pour vendre tout de suite")
            if not short and lp >= price:
                raise ValueError(f"Un achat limite doit être sous le prix actuel ({price:g}) ; utilise « Marché » pour acheter tout de suite")
            if short:
                terms = pos.open_short(size, lp, leverage, c["fee_pct"], c["margin_fee_pct"])
                reserve = terms["collateral"] + terms["open_fees"]
            else:
                reserve = size
            if c["mode"] == "paper":
                if self.state["cash"] < reserve:
                    raise ValueError("Solde paper insuffisant")
                self.state["cash"] -= reserve             # cash réservé jusqu'à l'exécution ou l'annulation
            self.state["pending"].append({"id": uuid.uuid4().hex[:8], "pair": pair, "side": side, "size": size, "limit": lp, "sl": sl,
                                          "tp": tp, "trail": trail, "leverage": leverage, "reserve": reserve,
                                          "created": datetime.now().strftime("%d/%m %H:%M")})
            self._save()
            self.log(f"Ordre limite en attente : {'short' if short else 'achat'} {LABELS.get(pair, pair)} {size:g} @ {'≥' if short else '≤'} {lp:g}")

    def _open(self, pair, side, size, price, sl, tp, trail, leverage, why):
        c, s = self.config, self.state
        short = side == "short"
        paper = c["mode"] == "paper"
        fill = None
        if short:
            fields = pos.open_short(size, price, leverage, c["fee_pct"], c["margin_fee_pct"])
            if paper:
                needed = fields["collateral"] + fields["open_fees"]
                if s["cash"] < needed:
                    raise ValueError("Solde paper insuffisant (garantie et frais du short)")
                s["cash"] -= needed
            else:
                fill = live.enter(pair, side, size / price, leverage)
                price = fill["price"] or price
                fields = {**pos.open_short(fill["cost"], price, leverage, c["fee_pct"], c["margin_fee_pct"]), "qty": fill["volume"],
                          "open_fees": fill["fee"]}
            fields["cost"] = fields["collateral"]
        elif paper:
            if s["cash"] < size:
                raise ValueError("Solde paper insuffisant")
            s["cash"] -= size
            fields = {"qty": size * (1 - c["fee_pct"] / 100) / price, "cost": size, "leverage": 1.0}
        else:
            fill = live.enter(pair, side, size / price, leverage)
            price = fill["price"] or price
            fields = {"qty": fill["volume"], "cost": fill["cost"] + fill["fee"], "leverage": 1.0}   # frais d'achat en monnaie de cotation (défaut Kraken)
        p = {"id": uuid.uuid4().hex[:8], "pair": pair, "side": side, "entry": price, "peak": price, "sl": sl, "tp": tp, "trail": trail,
             "ts": int(time.time()), "opened": datetime.now().strftime("%d/%m %H:%M"), **fields}
        s["positions"].append(p)
        self._record("SELL" if short else "BUY", p, "open", price, p["qty"], 0.0, why)
        if fill:
            self._protect(p)

    def _protect(self, p, replace=False):
        """Pose (ou remplace) le stop chez Kraken (`live.protect`) puis sauvegarde l'identifiant."""
        live.protect(p, self.log, replace)
        self._save()

    def _close(self, p, price, fraction, why, settled=None):
        """Ferme une fraction de la position. `settled` = exécution d'un stop déjà déclenché par Kraken (rien à envoyer, on enregistre)."""
        c, s = self.config, self.state
        qty = p["qty"] * fraction
        live_close = c["mode"] == "live"
        if settled is not None:
            price = settled["price"] or price
        elif live_close:
            fill = live.exit_market(p, qty)
            price = fill["price"] or price
        rollover = pos.rollover_due(p, time.time(), c["rollover_pct"])
        qty, pnl, cash_delta = pos.close_amounts(p, price, fraction, c["fee_pct"], rollover)
        if not live_close:
            s["cash"] += cash_delta
        if fraction >= 0.9999:
            s["positions"] = [x for x in s["positions"] if x["id"] != p["id"]]
        else:
            pos.scale(p, fraction)
        s["pnl"] += pnl
        self._record("BUY" if pos.is_short(p) else "SELL", p, "close", price, qty, pnl, why)
        if live_close and fraction < 0.9999 and settled is None:
            self._protect(p)             # le stop doit couvrir la quantité restante

    def _record(self, side, p, kind, price, qty, pnl, why):
        direction = p.get("side", "long")
        t = {"time": datetime.now().strftime("%d/%m %H:%M:%S"), "mode": self.config["mode"], "side": side, "dir": direction, "kind": kind,
             "pair": p["pair"], "price": price, "qty": qty, "pnl": pnl, "why": why, "ts": int(time.time())}
        self.state["trades"] = (self.state["trades"] + [t])[-300:]
        self._save()
        label = {"open": {"long": "achat", "short": "short"}, "close": {"long": "vente", "short": "rachat"}}[kind][direction]
        self.log(f"{self.config['mode'].upper()} {label} {LABELS.get(p['pair'], p['pair'])} {qty:.6f} @ {price:g} ({why})")

    def close_position(self, pid, fraction=1.0):
        fraction = float(fraction)
        if not 0 < fraction <= 1:
            raise ValueError("Fraction invalide (0 à 1)")
        with self.lock:
            p = self._find(pid)
            self._close(p, last_price(p["pair"], 0), fraction, "fermeture manuelle" if fraction >= 0.9999 else f"fermeture partielle {fraction * 100:g}%")

    def adjust_position(self, pid, d):
        with self.lock:
            p = self._find(pid)
            short = pos.is_short(p)
            sl = num(d, "sl_pct", p["sl"], 0, 50, "Stop loss")
            if short:
                if sl <= 0:
                    raise ValueError("Un short exige un stop loss")
                if sl >= pos.liq_distance_pct(p["leverage"]):
                    raise ValueError(f"Stop loss trop large : liquidation estimée à +{pos.liq_distance_pct(p['leverage']):.1f}%")
            p["sl"] = sl
            p["tp"] = num(d, "tp_pct", p["tp"], 0, 95 if short else 1000, "Take profit")
            p["trail"] = num(d, "trail_pct", p["trail"], 0, 50, "Stop suiveur")
            self._save()
            if self.config["mode"] == "live":
                self._protect(p, replace=True)
        self.log(f"{LABELS.get(p['pair'], p['pair'])} : SL {p['sl']:g}% · TP {p['tp']:g}% · suiveur {p['trail']:g}%")

    def cancel_pending(self, oid):
        with self.lock:
            o = next((x for x in self.state["pending"] if x["id"] == oid), None)
            if not o:
                raise ValueError("Ordre introuvable")
            self.state["pending"] = [x for x in self.state["pending"] if x["id"] != oid]
            if self.config["mode"] == "paper":
                self.state["cash"] += o["reserve"]              # cash réservé rendu
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
            short = o["side"] == "short"
            if price >= o["limit"] if short else price <= o["limit"]:
                s["pending"] = [x for x in s["pending"] if x["id"] != o["id"]]
                if self.config["mode"] == "paper":
                    s["cash"] += o["reserve"]            # l'ouverture reprend ce dont elle a besoin
                try:
                    self._open(o["pair"], o["side"], o["size"], price, o["sl"], o["tp"], o["trail"], o["leverage"],
                               f"ordre limite {'≥' if short else '≤'} {o['limit']:g}")
                except Exception as e:
                    self.log(f"Ordre limite non exécuté : {e}")
        for p in list(s["positions"]):
            try:
                price = last_price(p["pair"], 0)
            except Exception as e:
                self.log(f"Prix {p['pair']} indisponible: {e}")
                continue
            if self.config["mode"] == "live" and self._reconcile(p, price):
                continue
            p["peak"] = pos.best_price(p, price)
            why = pos.trigger_reason(p, price, p.get("stop_kind") if self.config["mode"] == "live" else None)
            if why:
                try:
                    self._close(p, price, 1.0, why)
                except Exception as e:
                    self.log(f"Fermeture automatique impossible ({p['pair']}) : {e}")
        self._save()

    def _reconcile(self, p, price):
        """Live : suit le stop posé chez Kraken. Renvoie True si la position vient d'être fermée par ce stop."""
        return live.reconcile(p, lambda fill: self._close(p, price, 1.0, "stop déclenché chez Kraken", settled=fill), self.log)

    # ---------- état pour l'UI ----------
    def _position_view(self, p):
        """Position enrichie pour l'interface : prix actuel, gains, niveaux de stop, liquidation estimée."""
        c = self.config
        try:
            px = last_price(p["pair"])
        except Exception:
            px = p["entry"]
        side = p.get("side", "long")
        p = {**p, "side": side, "leverage": p.get("leverage", 1.0)}
        rollover = pos.rollover_due(p, time.time(), c["rollover_pct"])
        sl, tp, trail = pos.stop_prices(p)
        return {**p, "label": LABELS.get(p["pair"], p["pair"]), "price": px, "value": p["qty"] * px,
                "pnl": pos.unrealized(p, px, c["fee_pct"], rollover), "pnl_pct": pos.favorable_pct(p, px),
                "equity_value": pos.equity_value(p, px), "rollover": rollover, "liq_price": pos.liq_price(p),
                "exchange_stop": bool(p.get("stop_id")) if c["mode"] == "live" else None,
                "notional": p["qty"] * p["entry"], "sl_price": sl, "tp_price": tp, "trail_price": trail}

    def snapshot(self, quote_pair=None):
        with self.lock:
            c, s = self.config, self.state
            views = [self._position_view(p) for p in s["positions"]]
            reserved = sum(o["reserve"] for o in s["pending"]) if c["mode"] == "paper" else 0.0
            quote = None
            if quote_pair:
                try:
                    quote = self.quote(quote_pair)
                except Exception:
                    quote = None
            return {"config": c, "cash": s["cash"], "reserved": reserved, "pnl": s["pnl"], "unrealized": sum(v["pnl"] for v in views),
                    "equity": s["cash"] + reserved + sum(v["equity_value"] for v in views), "shorts_allowed": self.shorts_allowed,
                    "positions": views, "pending": [{**o, "label": LABELS.get(o["pair"], o["pair"])} for o in s["pending"]],
                    "trades": [t for t in s["trades"] if t["mode"] == c["mode"]][-60:][::-1], "logs": self.journal.recent(40),
                    "live_ok": settings.kraken_configured(), "llm_ok": key_set(c["provider"]), "analyzing": proposals.running(), "providers": public(), "quote": quote}
