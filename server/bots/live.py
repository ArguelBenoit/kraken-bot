"""Exécution LIVE du trading manuel : ordres réels chez Kraken, stop posé chez Kraken, suivi de son exécution.

Un ordre d'ouverture est envoyé au marché, puis on attend son exécution pour lire le **prix et le volume réels**. Le stop est ensuite posé
chez Kraken comme ordre de fermeture distinct (`reduce_only` en marge) : un seul à la fois, car il réserve le volume.
- `sl` > 0  → ordre `stop-loss` au prix du stop loss (c'est le filet de sécurité dur) ;
- sinon `trail` > 0 → ordre `trailing-stop` à l'écart voulu (Kraken suit le prix) ;
- l'objectif (take profit) et, quand il y a un stop loss, le stop suiveur restent surveillés par le programme (`positions.trigger_reason`).
Un stop déclenché par Kraken est détecté par `check_stop`. **Rien ici n'a jamais été exécuté sur un compte réel.**
"""
from server.market import kraken
from server.market.pairs import LABELS
from . import positions as pos

STOP_KINDS = {"sl": "stop-loss", "trail": "trailing-stop"}


def _closing_side(p):
    """Sens des ordres qui ferment la position : rachat pour un short, vente pour un long."""
    return "buy" if pos.is_short(p) else "sell"


def _leverage(p):
    return p["leverage"] if pos.is_short(p) else None


def enter(pair, side, qty, leverage):
    """Ouvre au marché (achat pour un long, vente à découvert pour un short) et renvoie l'exécution réelle (prix, volume, coût, frais)."""
    short = side == "short"
    txid = kraken.market_order(pair, "sell" if short else "buy", qty, leverage=leverage if short else None)
    return kraken.wait_fill(txid)


def exit_market(p, qty):
    """Annule le stop de la position puis ferme `qty` au marché ; renvoie l'exécution réelle. Si la fermeture échoue, le stop est reposé."""
    cancel_stop(p)
    try:
        short = pos.is_short(p)
        txid = kraken.market_order(p["pair"], _closing_side(p), qty, leverage=_leverage(p), reduce_only=short)
        return kraken.wait_fill(txid)
    except Exception:
        place_stop(p)
        raise


def stop_plan(p):
    """(clé, ordre, niveau) du stop à poser chez Kraken, ou None s'il n'y en a pas à poser."""
    sl, _, _ = pos.stop_prices(p)
    if p["sl"] > 0 and sl:
        return "sl", STOP_KINDS["sl"], sl
    if p["trail"] > 0:
        return "trail", STOP_KINDS["trail"], p["trail"]
    return None


def place_stop(p):
    """Pose le stop chez Kraken et mémorise son identifiant dans la position ; renvoie le txid (None s'il n'y a rien à poser)."""
    plan = stop_plan(p)
    if plan is None:
        return None
    key, kind, level = plan
    p["stop_id"] = kraken.stop_order(p["pair"], _closing_side(p), p["qty"], kind, level, leverage=_leverage(p))
    p["stop_kind"] = key
    return p["stop_id"]


def cancel_stop(p):
    """Annule le stop posé chez Kraken, s'il y en a un."""
    if p.get("stop_id"):
        kraken.cancel_order(p["stop_id"])
        p["stop_id"] = p["stop_kind"] = None


def replace_stop(p):
    """Remplace le stop (niveaux modifiés, quantité réduite) : annule l'ancien puis pose le nouveau."""
    cancel_stop(p)
    return place_stop(p)


def check_stop(p):
    """État du stop posé chez Kraken : ('open', None), ('filled', exécution) s'il s'est déclenché, ('gone', None) s'il a disparu sans s'exécuter."""
    info = kraken.order_info(p["stop_id"])
    if info["status"] == "closed":
        return "filled", info
    if info["status"] in ("canceled", "expired"):
        return "gone", None
    return "open", None


def protect(p, log, replace=False):
    """Pose (ou remplace) le stop chez Kraken ; en cas d'échec la position reste ouverte SANS stop Kraken et l'alerte est écrite au journal."""
    try:
        replace_stop(p) if replace else place_stop(p)
    except Exception as e:
        log(f"ALERTE : stop non posé chez Kraken pour {LABELS.get(p['pair'], p['pair'])} ({e}) — nouvel essai au prochain contrôle")


def reconcile(p, on_filled, log):
    """Suit le stop posé chez Kraken et repose un stop manquant. `on_filled(exécution)` est appelé si Kraken l'a déclenché : renvoie alors True."""
    name = LABELS.get(p["pair"], p["pair"])
    try:
        if p.get("stop_id"):
            state, fill = check_stop(p)
            if state == "filled":
                on_filled(fill)
                return True
            if state == "gone":
                log(f"ALERTE : le stop Kraken de {name} a disparu sans s'exécuter — il est reposé")
                p["stop_id"] = p["stop_kind"] = None
        if not p.get("stop_id") and stop_plan(p):
            place_stop(p)
    except Exception as e:
        log(f"ALERTE : suivi du stop Kraken impossible ({name}) : {e}")
    return False
