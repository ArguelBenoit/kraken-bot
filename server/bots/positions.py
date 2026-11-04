"""Calculs purs d'une position du trading manuel, long (achat) ou short (vente à découvert en marge). Aucun accès réseau ni disque.

Une position est un dict avec : side ('long' | 'short'), qty, entry, cost, peak, sl / tp / trail (en %), et pour un short :
leverage, collateral (garantie immobilisée), open_fees (frais d'ouverture payés), size (montant vendu à l'ouverture), ts (ouverture).
Un long garde ses champs historiques (cost = montant dépensé). `peak` est toujours le MEILLEUR prix atteint depuis l'entrée :
le plus haut pour un long, le plus bas pour un short.
"""
LIQ_LOSS = 0.8          # liquidation estimée quand la perte atteint 80 % de la garantie (estimation, Kraken liquide selon son niveau de marge)
ROLLOVER_PERIOD = 4 * 3600      # Kraken facture le report d'une position en marge toutes les 4 h


def is_short(p):
    return p.get("side") == "short"


def liq_distance_pct(leverage):
    """Hausse (en %) qui provoque la liquidation estimée d'un short ouvert avec ce levier."""
    return LIQ_LOSS / leverage * 100


def liq_price(p):
    """Prix de liquidation estimé d'un short ; None pour un long (sans levier, il ne peut pas être liquidé)."""
    return p["entry"] * (1 + liq_distance_pct(p["leverage"]) / 100) if is_short(p) else None


def favorable_pct(p, price):
    """Variation du prix en % dans le sens qui fait gagner la position (hausse pour un long, baisse pour un short)."""
    e = p["entry"]
    return (e - price) / e * 100 if is_short(p) else (price / e - 1) * 100


def best_price(p, price):
    """Meilleur prix atteint depuis l'entrée, mis à jour avec `price`."""
    return min(p["peak"], price) if is_short(p) else max(p["peak"], price)


def stop_prices(p):
    """(stop loss, objectif, stop suiveur) en prix, None si non défini. Pour un short : stop au-dessus, objectif en dessous, suiveur au-dessus du creux."""
    e, sign = p["entry"], (1 if is_short(p) else -1)
    sl = e * (1 + sign * p["sl"] / 100) if p["sl"] else None
    tp = e * (1 - sign * p["tp"] / 100) if p["tp"] else None
    trail = p["peak"] * (1 + sign * p["trail"] / 100) if p["trail"] else None
    return sl, tp, trail


def trigger_reason(p, price, exchange_stop=None):
    """Motif de sortie automatique au prix actuel (liquidation, stop loss, objectif, stop suiveur), ou None.

    `exchange_stop` ('sl' ou 'trail') : ce niveau est déjà posé chez Kraken, le programme ne le surveille plus (Kraken s'en charge).
    """
    short = is_short(p)
    beyond = (lambda level: price >= level) if short else (lambda level: price <= level)       # stop franchi
    reached = (lambda level: price <= level) if short else (lambda level: price >= level)      # objectif atteint
    sl, tp, trail = stop_prices(p)
    liq = liq_price(p)
    if liq is not None and price >= liq:
        return "liquidation simulée"
    if sl is not None and exchange_stop != "sl" and beyond(sl):
        return f"stop loss {'+' if short else '−'}{p['sl']:g}%"
    if tp is not None and reached(tp):
        return f"take profit {'−' if short else '+'}{p['tp']:g}%"
    if trail is not None and exchange_stop != "trail" and beyond(trail):
        return f"stop suiveur {'+' if short else '−'}{p['trail']:g}%"
    return None


def rollover_due(p, now, rollover_pct):
    """Frais de report cumulés d'un short (un par période de 4 h écoulée depuis l'ouverture)."""
    if not is_short(p):
        return 0.0
    return p["size"] * rollover_pct / 100 * int((now - p["ts"]) // ROLLOVER_PERIOD)


def unrealized(p, price, fee_pct, rollover):
    """Gain / perte net estimé si on fermait maintenant, tous frais compris (ouverture, fermeture, report)."""
    if is_short(p):
        return (p["entry"] - price) * p["qty"] - p["open_fees"] - price * p["qty"] * fee_pct / 100 - rollover
    return p["qty"] * price * (1 - fee_pct / 100) - p["cost"]


def equity_value(p, price):
    """Ce que la position pèse dans l'équité : sa valeur (long) ou sa garantie plus le gain latent brut (short)."""
    if is_short(p):
        return p["collateral"] + (p["entry"] - price) * p["qty"]
    return p["qty"] * price


def close_amounts(p, price, fraction, fee_pct, rollover):
    """Résultat de la fermeture d'une fraction de la position : (quantité fermée, gain réalisé net, variation du cash paper)."""
    qty = p["qty"] * fraction
    if is_short(p):
        gross = (p["entry"] - price) * qty
        close_fee = price * qty * fee_pct / 100
        pnl = gross - close_fee - rollover * fraction - p["open_fees"] * fraction
        return qty, pnl, p["collateral"] * fraction + gross - close_fee - rollover * fraction
    proceeds = qty * price * (1 - fee_pct / 100)
    return qty, proceeds - p["cost"] * fraction, proceeds


def open_short(size, price, leverage, fee_pct, margin_fee_pct):
    """Champs d'un short ouvert pour `size` (montant vendu) : quantité, garantie immobilisée et frais d'ouverture."""
    return {"qty": size / price, "size": size, "collateral": size / leverage, "leverage": leverage,
            "open_fees": size * (fee_pct + margin_fee_pct) / 100}


def scale(p, fraction):
    """Retire `fraction` de la position (vente partielle), proportionnellement, sur tous ses montants."""
    keep = 1 - fraction
    for key in ("qty", "cost", "size", "collateral", "open_fees"):
        if key in p:
            p[key] *= keep
