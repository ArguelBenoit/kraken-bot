"""Lancement et suivi des backtests du Bot IA : un seul à la fois, en arrière-plan, annulable et pausable ; les essais terminés sont gardés dans `ai_backtests.json`."""
import calendar
import threading
import time
import uuid
from datetime import datetime

from server import settings
from server.bots.ai import config as cfgmod
from server.bots.ai.presets import PRESETS
from server.core.providers import key_set, public
from server.core.storage import load_json, save_json
from server.core.transport import Cancel, Cancelled
from server.market.pairs import WATCH
from . import data, stats
from .engine import Replay, StopRun
from .scenarios import SCENARIOS

FILE = settings.data_file("ai_backtests.json")
DRAFT_FILE = settings.data_file("ai_backtest_draft.json")      # formulaire en cours de saisie (partagé entre les machines)
KEPT = 15
ACTIVE = ("loading", "running", "paused")      # états d'un essai qui n'est pas terminé
# Réglages que la page peut modifier pour un essai ; tous les autres viennent des réglages enregistrés du Bot IA.
OVERRIDES = ("provider", "model", "pairs", "timeframe", "interval_min", "aggressiveness", "allow_short", "min_reward_risk", "max_leverage", "max_positions",
             "order_size", "budget", "max_exposure_pct", "max_daily_loss_pct", "fee_pct", "strategies", "notes",
             "trend_filter", "max_same_side", "max_drawdown_pct", "drawdown_days", "temperature")


def _end_ts(end):
    """Instant (secondes, UTC) de fin d'une période passée donnée en AAAA-MM-JJ : minuit au début de ce jour."""
    try:
        ts = calendar.timegm(time.strptime(end, "%Y-%m-%d"))
    except ValueError:
        raise ValueError("Date de fin invalide (format AAAA-MM-JJ)") from None
    if not calendar.timegm(time.strptime("2018-01-01", "%Y-%m-%d")) <= ts <= time.time():
        raise ValueError("Date de fin : entre le 01/01/2018 et aujourd'hui")
    return ts


class BacktestRunner:
    def __init__(self, ai):
        self.ai = ai                              # le Bot IA : ses réglages enregistrés servent de base
        self.lock = threading.Lock()
        self.current = None                       # run en cours, ou le dernier terminé
        self.cancel_token = None
        self.gate = threading.Event()               # levé = le rejeu avance ; baissé = en pause
        self.history = load_json(FILE, [])
        for r in self.history:                    # essais gardés avant l'ajout de cette statistique : on la déduit de leurs trades
            if r.get("stats") and "max_open" not in r["stats"]:
                r["stats"]["max_open"] = stats.max_open(r["trades"])
            if r.get("stats") and "peak_pct" not in r["stats"] and r.get("equity"):
                r["stats"]["peak_pct"] = stats.peak_pct([row[1] for row in r["equity"]], r["params"]["budget"])

    # ---------- lancement ----------
    def start(self, params):
        """Valide les paramètres (sur les réglages du Bot IA, en paper) et lance le rejeu en arrière-plan."""
        with self.lock:
            if self.current and self.current["status"] in ACTIVE:
                raise ValueError("Un backtest est déjà en cours")
            cfg = cfgmod.validate(self.ai.config, {**{k: params[k] for k in OVERRIDES if k in params}, "mode": "paper"}, busy=False)
            if not key_set(cfg["provider"]):
                raise ValueError("Clé du fournisseur absente (.env) ou fournisseur injoignable")
            days = float(params.get("days") or 0)
            if not 0 < days <= data.max_days(cfg["timeframe"]):
                raise ValueError(f"Durée invalide : de 1 à {data.max_days(cfg['timeframe']):.0f} jours avec des bougies de {cfg['timeframe']} min")
            end = str(params.get("end") or "")
            if end >= time.strftime("%Y-%m-%d", time.gmtime()):       # aujourd'hui (ou plus tard) = les dernières bougies de Kraken
                end = ""
            end_ts = _end_ts(end) if end else None
            max_calls = int(params["max_calls"]) if params.get("max_calls") not in (None, "") else None
            self.cancel_token = Cancel()
            self.gate.set()
            self.current = {
                "id": uuid.uuid4().hex[:8], "started": datetime.now().strftime("%d/%m %H:%M"), "status": "loading", "error": "",
                "params": {**{k: cfg[k] for k in OVERRIDES if k not in ("notes",)}, "days": days, "max_calls": max_calls, "end": end or None},
                "progress": {"step": 0, "steps": 0, "calls": 0, "at": ""}, "usage": {"in": 0, "out": 0}, "fees": 0.0, "errors": 0, "refused": 0,
                "equity": [], "trades": [], "decisions": [], "exchanges": [], "stats": {}}
            threading.Thread(target=self._work, args=(self.current, self.cancel_token, cfg, days, max_calls, end_ts), daemon=True).start()

    def _work(self, run, cancel, cfg, days, max_calls, end_ts):
        began = time.time()
        try:
            candles = data.load(cfg["pairs"], cfg["timeframe"], end_ts)
            cfg = {**cfg, "pairs": list(candles)}                 # paires sans historique à cette date écartées
            run["params"]["pairs"] = cfg["pairs"]
            replay = Replay(cfg, candles, days, run, max_calls, cancel, self.gate)
            run["status"] = "running"
            replay.go()
            run["status"] = "cancelled" if cancel.cancelled else "done"
        except Cancelled:
            run["status"] = "cancelled"
        except StopRun as e:
            run["status"], run["error"] = "stopped", str(e)
        except Exception as e:
            run["status"], run["error"] = "error", str(e)[:300]
        run["seconds"] = round(time.time() - began)
        self._keep(run)

    def _keep(self, run):
        with self.lock:
            self.history = [run] + [r for r in self.history if r["id"] != run["id"]]
            self.history = self.history[:KEPT]
            save_json(FILE, self.history)

    # ---------- contrôle et lecture ----------
    def running(self):
        """Un backtest est-il en cours ?"""
        return bool(self.current and self.current["status"] in ACTIVE)

    def paused(self):
        """Le backtest est-il en pause ?"""
        return bool(self.current and self.current["status"] == "paused")

    def pause(self):
        """Met le rejeu en pause entre deux bougies (l'appel au modèle en cours se termine d'abord)."""
        with self.lock:
            if self.current and self.current["status"] == "running":
                self.gate.clear()
                self.current["status"] = "paused"

    def resume(self):
        """Reprend un rejeu en pause."""
        with self.lock:
            if self.current and self.current["status"] == "paused":
                self.current["status"] = "running"
                self.gate.set()

    def cancel(self):
        """Interrompt le backtest en cours (coupe aussi l'appel au modèle en cours)."""
        if self.cancel_token and self.running():
            self.cancel_token.trigger()

    def delete(self, run_id):
        with self.lock:
            self.history = [r for r in self.history if r["id"] != run_id]
            save_json(FILE, self.history)
            if self.current and self.current["id"] == run_id and self.current["status"] not in ACTIVE:
                self.current = None

    def draft(self):
        """Dernier formulaire enregistré, ou None."""
        return load_json(DRAFT_FILE)

    def save_draft(self, data):
        """Enregistre le formulaire tel quel (simple dict JSON : il est revalidé au lancement)."""
        if not isinstance(data, dict):
            raise ValueError("formulaire invalide")
        save_json(DRAFT_FILE, data)

    def _find(self, run_id):
        if self.current and self.current["id"] == run_id:
            return self.current
        return next((r for r in self.history if r["id"] == run_id), None)

    def get(self, run_id):
        """Un essai complet (en cours ou gardé), ou None ; sans les échanges avec le modèle (voir `exchange`)."""
        found = self._find(run_id)
        return {k: v for k, v in found.items() if k != "exchanges"} if found else None

    def exchange(self, run_id, number):
        """Demande et réponse du modèle pour la décision n° `number` d'un essai, ou None (essai ou échange inconnu, essai fait avant leur enregistrement)."""
        found = self._find(run_id)
        exchanges = found.get("exchanges", []) if found else []
        return exchanges[number] if 0 <= number < len(exchanges) else None

    def snapshot(self):
        """Essai courant (complet) + liste résumée des essais gardés + options du formulaire."""
        summary = [{k: r[k] for k in ("id", "started", "status", "params", "stats")} for r in self.history]
        cfg = self.ai.config
        return {"current": self.current and {k: v for k, v in self.current.items() if k != "exchanges"}, "history": summary,
                "options": {"providers": public(), "scenarios": SCENARIOS, "presets": PRESETS, "pairs": [{"pair": p, "label": l} for p, l in WATCH], "strategies": cfgmod.STRATEGIES,
                            "defaults": {k: cfg[k] for k in OVERRIDES},
                            "max_days": {str(tf): round(data.max_days(tf)) for tf in cfgmod.TIMEFRAMES}}}
