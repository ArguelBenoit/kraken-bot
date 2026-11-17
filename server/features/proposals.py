"""Propositions de trade du modèle pour la page Trading : quelques « presets » à prendre MAINTENANT (paire, long ou short, entrée au marché ou limite, stops).

Le modèle ne fait que proposer : chaque preset est nettoyé et borné par le code, puis renvoyé à l'interface qui se contente de pré-remplir le
ticket d'ordre. Rien n'est envoyé sans clic de l'utilisateur, et le modèle ne choisit jamais le montant engagé, les frais ni le mode.
"""
import json
import threading
import time

from server.bots import positions as pos
from server.core.llm import call_tool
from server.core.transport import Cancel, LlmError
from server.market.pairs import LABELS, WATCH
from server.market.snapshot import market_snapshot

TIMEFRAME = 240
MAX_PRESETS = 4
COOLDOWN = 10.0
FEES_ROUND_TRIP = 0.52            # % : aller-retour Kraken (taker) ; un objectif plus bas ne peut pas être rentable
MIN_LEVERAGE = 2.0
BOUNDS = {"sl_pct": (0.5, 10.0), "tp_pct": (FEES_ROUND_TRIP + 0.5, 25.0), "trail_pct": (0.5, 10.0), "limit_discount_pct": (0.3, 5.0)}
_lock = threading.Lock()
_last = 0.0
_cancel = None                 # jeton de l'analyse en cours
_result = None                  # dernière proposition, gardée pour la retrouver après un rechargement de la page


class ProposalError(LlmError):
    """Demande refusée par le serveur (déjà en cours, trop rapprochée) — et non échec de l'API du modèle."""


TOOL = {
    "name": "propose_trades",
    "description": "Propose 0 à 4 trades à prendre maintenant, du plus convaincant au moins convaincant.",
    "input_schema": {"type": "object", "properties": {
        "market_view": {"type": "string", "description": "Lecture du marché en 1-2 phrases."},
        "no_edge": {"type": "boolean", "description": "true si aucun trade n'a d'avantage net maintenant (alors `trades` peut être vide)."},
        "trades": {"type": "array", "maxItems": MAX_PRESETS, "items": {"type": "object", "properties": {
            "pair": {"type": "string", "enum": [p for p, _ in WATCH]},
            "side": {"type": "string", "enum": ["long", "short"], "description": "long = parier sur la hausse ; short = parier sur la baisse (vente à découvert en marge, seulement si `shorts_autorises`)."},
            "leverage": {"type": "number", "description": "short uniquement : levier 2 à `levier_max`. Un levier plus bas est plus sûr."},
            "title": {"type": "string", "description": "Nom court du scénario, ex. « Rebond sur survente »."},
            "entry": {"type": "string", "enum": ["market", "limit"], "description": "market = tout de suite ; limit = attendre un repli (long) ou un rebond (short)."},
            "limit_discount_pct": {"type": "number", "description": "entry=limit : écart attendu avec le prix actuel, en % (0.3 à 5) : sous le prix pour un long, au-dessus pour un short."},
            "sl_pct": {"type": "number", "description": "Stop loss en % contre la position (obligatoire, 0.5 à 10) : sous l'entrée pour un long, au-dessus pour un short."},
            "tp_pct": {"type": "number", "description": "Objectif en % dans le sens favorable (0 = aucun ; sinon bien au-dessus des frais, ≥ 1)."},
            "trail_pct": {"type": "number", "description": "Stop suiveur en % depuis le plus haut (0 = aucun)."},
            "confidence": {"type": "number", "description": "0 à 1, honnête (la plupart du temps < 0.6)."},
            "rationale": {"type": "string", "description": "Pourquoi maintenant, en français simple, chiffré, 2 à 4 phrases, avec le risque principal."},
        }, "required": ["pair", "side", "title", "entry", "sl_pct", "confidence", "rationale"]}},
    }, "required": ["market_view", "no_edge", "trades"]},
}

SYSTEM = """Tu es le conseiller d'un trader qui passe ses ordres à la main sur Kraken (spot, paire contre stablecoin ; long, et short en marge quand `shorts_autorises` est vrai). On te donne un \
résumé chiffré du marché en bougies de 4 h (RSI, EMA 20/50, Bollinger, plus hauts/bas, rendements, volatilité) ; tu proposes quelques trades à prendre \
MAINTENANT, en appelant l'outil `propose_trades` (aucun texte en dehors de l'appel).

Règles :
- Pour chaque trade : la paire, le sens (long ou short), l'entrée (marché ou limite), un stop loss obligatoire, un objectif et/ou un stop suiveur.
- Short = vente à découvert avec levier : la perte peut dépasser la mise et la position peut être liquidée si le prix monte ; il coûte aussi des frais de report toutes les 4 h. Ne propose un short que sur une tendance baissière claire (EMA20 sous EMA50, prix sous la moyenne, RSI qui ne rebondit pas), avec un stop serré et un levier bas. Si `shorts_autorises` est faux, ne propose AUCUN short.
- Frais Taker 0,26 % par ordre, ≈ 0,5 % l'aller-retour : un objectif doit dépasser nettement ce coût et le rapport gain/risque doit être favorable.
- Varie les scénarios (rebond sur survente, continuation de tendance, cassure…) et les paires ; ne propose pas une paire déjà détenue (`paires_deja_detenues`).
- En live le stop loss est posé chez Kraken, l'objectif et le stop suiveur sont surveillés par le programme. Aucun gain n'est garanti : sois honnête sur ta confiance.
- Les tests de ce projet n'ont montré qu'un avantage faible et fragile : si rien n'a d'avantage net, mets no_edge=true et renvoie peu ou pas de trade. Attendre est valable.
- Tu ne choisis PAS le montant engagé : l'utilisateur le règle."""


def _num(raw, key, default=0.0):
    try:
        return float(raw.get(key) if raw.get(key) is not None else default)
    except (TypeError, ValueError):
        return default


def _clamp(value, key):
    lo, hi = BOUNDS[key]
    return round(min(max(value, lo), hi), 2)


def sanitize(raw, prices, held, shorts_ok=False, max_leverage=3.0):
    """Presets bruts du modèle -> presets valides : paires connues et libres, bornes respectées, prix limite et ratio calculés par le code.

    Un short n'est gardé que si les shorts sont autorisés ; son levier est borné et son stop loss reste sous la distance de liquidation.
    """
    out, seen = [], set(held)
    for item in (raw if isinstance(raw, list) else []):
        pair = str(item.get("pair", "")).upper() if isinstance(item, dict) else ""
        if pair not in LABELS or pair in seen or pair not in prices:
            continue
        seen.add(pair)
        short = item.get("side") == "short"
        if short and not shorts_ok:
            continue
        leverage = min(max(_num(item, "leverage", MIN_LEVERAGE), MIN_LEVERAGE), max_leverage) if short else 1.0
        sl = _clamp(_num(item, "sl_pct", 3.0), "sl_pct")
        if short:
            sl = min(sl, round(pos.liq_distance_pct(leverage) * 0.5, 2))      # le stop doit rester bien en deçà de la liquidation
        tp = _num(item, "tp_pct")
        tp = _clamp(tp, "tp_pct") if tp > 0 else 0.0
        trail = _num(item, "trail_pct")
        trail = _clamp(trail, "trail_pct") if trail > 0 else 0.0
        limit = item.get("entry") == "limit"
        discount = _clamp(_num(item, "limit_discount_pct", 1.0), "limit_discount_pct") if limit else 0.0
        price = prices[pair]
        entry = price * (1 + discount / 100) if short else price * (1 - discount / 100)
        confidence = _num(item, "confidence", 0.0)
        out.append({
            "pair": pair, "label": LABELS[pair], "side": "short" if short else "long", "leverage": leverage,
            "liq_price": price * (1 + pos.liq_distance_pct(leverage) / 100) if short else None,
            "title": str(item.get("title", ""))[:60] or LABELS[pair],
            "type": "limit" if limit else "market", "price": price,
            "limit_price": float(f"{entry:.6g}") if limit else None, "limit_discount_pct": discount,
            "sl_pct": sl, "tp_pct": tp, "trail_pct": trail,
            "ratio": round(tp / sl, 2) if tp else None,
            "confidence": min(max(confidence, 0.0), 1.0), "rationale": str(item.get("rationale", ""))[:700],
        })
        if len(out) == MAX_PRESETS:
            break
    return out


def running():
    """True tant qu'une analyse est en cours (visible par toutes les pages ouvertes, même rechargées)."""
    return _lock.locked()


def cancel():
    """Interrompt l'analyse en cours (coupe la connexion au modèle) ; False s'il n'y en a pas."""
    token = _cancel
    if token:
        token.trigger()
    return token is not None


def last_result():
    """Dernière proposition du modèle, ou None."""
    return _result


def dismiss():
    """Oublie la dernière proposition."""
    global _result
    _result = None


def propose(manual, provider, model):
    """Demande au modèle des trades pour maintenant. `manual` = le trader manuel (positions déjà ouvertes ou en attente à exclure)."""
    global _last, _result, _cancel
    if not _lock.acquire(blocking=False):
        raise ProposalError("Une analyse est déjà en cours.", 429)
    try:
        if time.time() - _last < COOLDOWN:
            raise ProposalError(f"Patiente quelques secondes entre deux demandes ({COOLDOWN:.0f} s).", 429)
        _cancel = Cancel()
        held = sorted({p["pair"] for p in manual.state["positions"]} | {o["pair"] for o in manual.state["pending"]})
        market = [r for r in market_snapshot(TIMEFRAME, [p for p, _ in WATCH]) if "error" not in r]
        shorts_ok = manual.shorts_allowed
        max_lev = manual.config["max_leverage"]
        context = {"now": time.strftime("%Y-%m-%d %H:%M"), "bougies_min": TIMEFRAME, "paires_deja_detenues": held,
                   "shorts_autorises": shorts_ok, "levier_max": max_lev, "marche": market}
        raw, _tokens = call_tool(provider, model, SYSTEM, json.dumps(context, ensure_ascii=False), TOOL, max_tokens=2500, cancel=_cancel)
        _last = time.time()
        prices = {r["pair"]: r["price"] for r in market}
        trades = sanitize(raw.get("trades"), prices, held, shorts_ok, max_lev)
        _result = {"trades": trades, "provider": provider, "model": model, "market_view": str(raw.get("market_view", ""))[:400],
                   "no_edge": bool(raw.get("no_edge")) or not trades, "at": int(time.time())}
        return _result
    finally:
        _cancel = None
        _lock.release()
