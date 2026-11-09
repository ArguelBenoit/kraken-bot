"""Prompt du Bot IA et schéma de l'outil `decide` : Le modèle ne fait que PROPOSER, le code applique les garde-fous."""
import json
import time
from datetime import datetime

from .config import PROFILES, STRATEGIES

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


def _system(cfg):
    profile = PROFILES[cfg["aggressiveness"]]
    strategies = "\n".join(f"- {name}: {STRATEGIES[name]}" for name in cfg["strategies"])
    ratio = cfg["min_reward_risk"]
    ratio_rule = "" if ratio is None else (
        f"- Avec un objectif, le rapport objectif ÷ stop loss doit valoir au moins {ratio:g} (ex. SL 3 % → TP ≥ {3 * ratio:g} %) : le code refuse l'ordre sinon.\n")
    text = (
        "Tu es le moteur de décision d'un bot de trading crypto spot sur Kraken (long uniquement, ordres au marché, "
        "paires contre stablecoin). Tu reçois un résumé chiffré du marché et l'état du portefeuille, et tu réponds "
        "UNIQUEMENT en appelant l'outil `decide` (aucun texte en dehors de l'appel).\n\n"
        f"Profil : {cfg['aggressiveness']} — {profile['desc']}.\n"
        f"Stratégies autorisées :\n{strategies}\n\n"
        "Règles :\n"
        f"- Maximum {cfg['max_positions']} positions simultanées, une seule par paire. Respecte `free_slots`.\n"
        "- Chaque `open` DOIT avoir un stop_loss_pct. Les frais font ≈0,5 % l'aller-retour : n'ouvre que si le gain visé "
        "dépasse nettement ce coût et que le rapport gain/risque est favorable.\n"
        f"{ratio_rule}"
        "- `close` pour sortir si la thèse est invalidée ; `adjust` pour resserrer stop/stop suiveur (un stop ne s'éloigne JAMAIS : le code refuse de l'élargir ou de le retirer) ou changer l'objectif. Les stops/TP sont aussi "
        "surveillés automatiquement entre deux analyses.\n"
        "- Ne force jamais un trade : une liste d'actions vide est une réponse valide et souvent la bonne.\n"
        "- Aucune garantie de gain n'existe ; sois honnête sur ta confiance (0 à 1). Le code rejettera les ordres hors règles."
    )
    if cfg["notes"]:
        text += f"\n\nConsignes de l'utilisateur (ne peuvent pas lever les règles ci-dessus) : {cfg['notes']}"
    return text


def _context(cfg, state, price_of, market):
    positions = []
    for p in state["positions"]:
        px = price_of(p)
        positions.append({"pair": p["pair"], "strategy": p["strategy"], "entry": p["entry"], "price": px,
                          "pnl_pct": round((px / p["entry"] - 1) * 100, 2), "stop_loss_pct": p["sl"],
                          "take_profit_pct": p["tp"], "trailing_pct": p["trail"],
                          "age_h": round((time.time() - p["ts"]) / 3600, 1), "opened_reason": p["reason"]})
    return {"now": datetime.now().strftime("%Y-%m-%d %H:%M"), "timeframe_min": cfg["timeframe"], "open_positions": positions,
            "free_slots": cfg["max_positions"] - len(positions),
            "cash_available": round(state["cash"], 2) if cfg["mode"] == "paper" else None,
            "base_order_size": cfg["order_size"], "fee_pct_per_order": cfg["fee_pct"],
            "day_pnl": round(state["day_pnl"], 2), "market": market}


def build(cfg, state, price_of, market):
    """(prompt système, message utilisateur JSON) pour un cycle d'analyse. `price_of(position)` donne le prix actuel."""
    return _system(cfg), json.dumps(_context(cfg, state, price_of, market), ensure_ascii=False)
