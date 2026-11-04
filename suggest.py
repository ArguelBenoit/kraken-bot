"""Mode IA du bot simple : Claude regarde le marché et propose LE meilleur réglage du moment (paire, méthode, bougie, seuils, stops).
La proposition est nettoyée et validée par le code (mêmes limites que la saisie manuelle) puis renvoyée : l'interface ne fait que
pré-remplir le formulaire, rien n'est enregistré ni lancé sans clic de l'utilisateur. Claude ne règle jamais le montant, les frais ni le mode."""
import json, os, threading, time

import requests

import bot as botmod
from ai_bot import API_URL, market_snapshot

TFS = (60, 240, 1440)
# jamais décidés par Claude : l'argent engagé, les frais, la fréquence d'analyse
LOCKED = ("order_size", "fee_pct", "check_every")
FIELDS = [k for k in botmod.CONFIG_FIELDS if k not in LOCKED]
COOLDOWN = 10.0
PROPOSAL_MAX = {"stop_loss_pct": 15, "trailing_pct": 20, "take_profit_pct": 30, "atr_stop": 6}
_lock = threading.Lock()
_last = 0.0


class SuggestError(Exception):
    def __init__(self, msg, status=502):
        super().__init__(msg)
        self.status = status


def _tool():
    pairs = [p for p, _ in botmod.WATCH]
    num = lambda d: {"type": "number", "description": d}
    return {
        "name": "propose_config",
        "description": "Propose le réglage complet du bot pour maintenant.",
        "input_schema": {"type": "object", "properties": {
            "pair": {"type": "string", "enum": pairs},
            "strategy": {"type": "string", "enum": list(botmod.STRATEGIES)},
            "timeframe": {"type": "integer", "enum": list(TFS), "description": "minutes ; 240 conseillé"},
            "stop_loss_pct": num("stop loss en % (0.5 à 15)"), "take_profit_pct": num("objectif en % (rsi et bollinger seulement)"),
            "trailing_pct": num("stop suiveur en % (méthodes autres que rsi/bollinger ; 0 = off)"),
            "rsi_period": {"type": "integer"}, "rsi_buy": num("1-50"), "rsi_sell": num("50-99"),
            "ma_fast": {"type": "integer"}, "ma_slow": {"type": "integer"},
            "bb_period": {"type": "integer"}, "bb_std": num("0.5-4"),
            "dc_entry": {"type": "integer"}, "dc_exit": {"type": "integer"},
            "macd_fast": {"type": "integer"}, "macd_slow": {"type": "integer"}, "macd_signal": {"type": "integer"},
            "mom_period": {"type": "integer"}, "mom_min_pct": num("0-100"),
            "filter_ema": {"type": "integer", "description": "0 = pas de filtre ; 200 = n'achète qu'au-dessus de l'EMA200"},
            "filter_tf": {"type": "integer", "enum": [0, 60, 240, 1440]}, "atr_stop": num("0 = stop en % ; sinon multiple d'ATR (0-10)"),
            "rationale": {"type": "string", "description": "Explication en français, simple et honnête, 3 à 6 phrases : pourquoi ce réglage maintenant, quels risques."},
            "market_view": {"type": "string", "description": "Lecture du marché en 1 phrase."},
            "confidence": num("0 à 1, honnête (la plupart du temps < 0.6)"),
            "no_edge": {"type": "boolean", "description": "true si aucune configuration ne paraît avoir un avantage net maintenant (mieux vaut ne pas trader)."},
        }, "required": ["pair", "strategy", "timeframe", "stop_loss_pct", "rationale", "market_view", "confidence", "no_edge"]},
    }


SYSTEM = f"""Tu es le conseiller de réglage d'un bot de trading crypto spot sur Kraken (long uniquement, UNE seule position à la fois, ordres au marché, \
paire contre stablecoin). On te donne un résumé chiffré du marché ; tu choisis la paire, la méthode et ses paramètres, en appelant l'outil `propose_config`.

Méthodes (mêmes noms que dans l'outil) :
- rsi : achète quand le RSI(rsi_period) de la dernière bougie close <= rsi_buy ; vend si RSI >= rsi_sell, take_profit_pct ou stop_loss_pct.
- trend : achète sur croisement haussier EMA ma_fast / ma_slow ; sort sur croisement baissier, stop_loss_pct ou trailing_pct.
- bollinger : achète sous la bande basse (bb_period, bb_std), vend au retour à la moyenne, take_profit_pct ou stop_loss_pct.
- donchian : achète sur cassure du plus haut des dc_entry bougies, sort sous le plus bas des dc_exit bougies, stop_loss_pct, trailing_pct.
- macd : achète sur croisement haussier MACD/signal (macd_fast, macd_slow, macd_signal), stop_loss_pct, trailing_pct.
- momentum : achète si hausse >= mom_min_pct sur mom_period bougies (et RSI < 80), vend si cette hausse devient négative, stop_loss_pct, trailing_pct.
Options communes : filter_ema (+ filter_tf) n'autorise l'achat qu'au-dessus d'une EMA longue ; atr_stop remplace le stop en % par un stop selon la volatilité.

Contraintes et honnêteté :
- Frais Taker 0,26 % par ordre, ≈ 0,5 % l'aller-retour : n'attends un gain que bien supérieur. Les stops sont surveillés par le programme (pas chez Kraken).
- Les tests de ce projet : 1 h = presque rien de rentable ; 1 jour = suit le prix ; 4 h (240) avec RSI court (7), achat 30-35, vente 65-70 = seule zone un peu positive, \
mais échantillons faibles et biais de sélection. Les réglages EMA issus de grids sont très fragiles. Ne promets rien, ne survends pas ta confiance.
- Les données fournies sont en bougies de 4 h. Reste sur timeframe 240 sauf raison forte.
- Limites : rsi_buy 1-50, rsi_sell 50-99 (rsi_buy < rsi_sell), ma_fast < ma_slow, macd_fast < macd_slow, stop_loss_pct 0.5-15.
- Si aucun réglage n'a d'avantage net maintenant, mets no_edge=true, propose quand même un réglage PRUDENT et explique pourquoi attendre est une option valable.
- Tu ne règles PAS le montant des ordres ni les frais. Réponds uniquement en appelant l'outil."""


def _call(system, user, model):
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise SuggestError("ANTHROPIC_API_KEY absente (.env) : ajoute-la puis relance le serveur.", 400)
    try:
        r = requests.post(API_URL, timeout=90, headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                          json={"model": model, "max_tokens": 1800, "system": system, "tools": [_tool()], "tool_choice": {"type": "auto"},
                                "messages": [{"role": "user", "content": user}]})
    except requests.RequestException as e:
        raise SuggestError(f"API Claude injoignable : {e}")
    if r.status_code != 200:
        if "credit balance" in r.text:
            raise SuggestError("Crédit Anthropic épuisé : recharge dans la console (Plans & Billing).")
        raise SuggestError(f"API Claude {r.status_code} : {r.text[:200]}")
    for b in r.json().get("content", []):
        if b.get("type") == "tool_use" and b.get("name") == "propose_config":
            return b["input"]
    raise SuggestError("Claude n'a pas proposé de réglage (réponse sans appel d'outil).")


def sanitize(raw, current):
    """Proposition brute -> réglage valide : valeurs inconnues ignorées, bornes respectées, cohérences (rapide < lente…) rétablies."""
    pairs = {p for p, _ in botmod.WATCH}
    out = {k: current[k] for k in FIELDS}
    for k in FIELDS:
        if k not in raw or raw[k] is None:
            continue
        default = botmod.DEFAULT_CONFIG[k]
        try:
            v = str(raw[k]).strip().upper() if k == "pair" else str(raw[k]).strip().lower() if k == "strategy" else type(default)(raw[k])
        except (TypeError, ValueError):
            continue
        if k == "pair" and v not in pairs:
            continue
        if k == "strategy" and v not in botmod.STRATEGIES:
            continue
        if k == "timeframe" and v not in TFS:
            continue
        if k == "filter_tf" and v not in (0,) + TFS:
            continue
        if k in botmod.LIMITS:
            lo, hi = botmod.LIMITS[k]
            hi = min(hi, PROPOSAL_MAX.get(k, hi))      # plafonds plus stricts que les limites techniques
            v = type(default)(min(max(v, lo), hi))
        out[k] = v
    if out["rsi_buy"] >= out["rsi_sell"]:
        out["rsi_sell"] = min(99, out["rsi_buy"] + 20)
        out["rsi_buy"] = min(out["rsi_buy"], out["rsi_sell"] - 1)
    if out["ma_fast"] >= out["ma_slow"]:
        out["ma_slow"] = min(botmod.LIMITS["ma_slow"][1], out["ma_fast"] + 10)
    if out["macd_fast"] >= out["macd_slow"]:
        out["macd_slow"] = min(botmod.LIMITS["macd_slow"][1], out["macd_fast"] + 10)
    return out


def propose(bot, has_position, lock_pair, model):
    """Demande à Claude un réglage pour maintenant. `bot` = instance de Bot (config + validation)."""
    global _last
    if not _lock.acquire(blocking=False):
        raise SuggestError("Une analyse est déjà en cours.", 429)
    try:
        if time.time() - _last < COOLDOWN:
            raise SuggestError(f"Patiente quelques secondes entre deux demandes ({COOLDOWN:.0f} s).", 429)
        cur = bot.config
        pairs = [cur["pair"]] if lock_pair else [p for p, _ in botmod.WATCH]
        rows = market_snapshot(240, pairs)
        ctx = {"now": time.strftime("%Y-%m-%d %H:%M"), "timeframe_data_min": 240, "paire_imposee": cur["pair"] if lock_pair else None,
               "reglage_actuel": {k: cur[k] for k in ("pair", "strategy", "timeframe", "stop_loss_pct", "take_profit_pct")},
               "position_ouverte": has_position, "marche": [r for r in rows if "error" not in r]}
        raw = _call(SYSTEM, json.dumps(ctx, ensure_ascii=False), model)
        _last = time.time()
        proposal = sanitize(raw, cur)
        if lock_pair:
            proposal["pair"] = cur["pair"]
        try:
            valid = bot.validate_config(proposal)
        except ValueError as e:
            raise SuggestError(f"Proposition de Claude rejetée par la validation : {e}")
        conf = raw.get("confidence")
        return {"config": {k: valid[k] for k in FIELDS}, "model": model,
                "rationale": str(raw.get("rationale", ""))[:1200], "market_view": str(raw.get("market_view", ""))[:400],
                "confidence": min(max(float(conf), 0.0), 1.0) if isinstance(conf, (int, float)) else None,
                "no_edge": bool(raw.get("no_edge")), "has_position": has_position}
    finally:
        _lock.release()
