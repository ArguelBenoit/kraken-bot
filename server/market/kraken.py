"""Client de l'API Kraken : données publiques (bougies, prix) et ordres signés (HMAC) : au marché, stops, annulation, suivi d'exécution.

Les paires sont désignées par leur « altname » Kraken (XBTUSDC, pas BTC ; XDGUSDC pour DOGE).
**Les fonctions d'ordres n'ont jamais été exécutées sur un compte réel** (ni même en `validate=true`) : voir `python -m server.check_kraken`.
"""
import base64
import hashlib
import hmac
import math
import os
import time
import urllib.parse

import requests

from server.core.cache import memo

BASE = "https://api.kraken.com"
TIMEOUT = 15


def public(method, **params):
    """Appel d'un point d'accès public ; lève RuntimeError avec le message de Kraken en cas d'erreur."""
    r = requests.get(f"{BASE}/0/public/{method}", params=params, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if data.get("error"):
        raise RuntimeError(", ".join(data["error"]))
    return data["result"]


def ohlc(pair, interval):
    """Bougies [(temps, ouverture, haut, bas, clôture)] ; la dernière (en cours de formation) est incluse."""
    res = public("OHLC", pair=pair, interval=interval)
    key = next(k for k in res if k != "last")
    return [(int(c[0]), float(c[1]), float(c[2]), float(c[3]), float(c[4])) for c in res[key]]


def closed_candles(pair, interval):
    """Bougies terminées uniquement (sans celle en cours de formation) : seules sources de signaux."""
    return ohlc(pair, interval)[:-1]


def last_price(pair):
    res = public("Ticker", pair=pair)
    return float(next(iter(res.values()))["c"][0])


def _private(method, **params):
    """Appel d'un point d'accès privé signé ; exige KRAKEN_API_KEY / KRAKEN_API_SECRET."""
    key, secret = os.getenv("KRAKEN_API_KEY"), os.getenv("KRAKEN_API_SECRET")
    if not key or not secret:
        raise RuntimeError("KRAKEN_API_KEY / KRAKEN_API_SECRET manquants dans .env")
    path = f"/0/private/{method}"
    params["nonce"] = str(int(time.time() * 1000))
    body = urllib.parse.urlencode(params)
    message = path.encode() + hashlib.sha256((params["nonce"] + body).encode()).digest()
    signature = base64.b64encode(hmac.new(base64.b64decode(secret), message, hashlib.sha512).digest()).decode()
    r = requests.post(BASE + path, data=body, headers={"API-Key": key, "API-Sign": signature}, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if data.get("error"):
        raise RuntimeError(", ".join(data["error"]))
    return data["result"]


def asset_pairs():
    """Toutes les paires Kraken par altname : `{altname: infos Kraken + "key" (clé interne)}`, en cache 1 h."""
    return memo("asset_pairs", 3600, lambda: {v["altname"]: {**v, "key": k} for k, v in public("AssetPairs").items()})


def _volume(pair, volume):
    """Volume arrondi (vers le bas) aux décimales de lot de la paire ; refuse un volume sous le minimum `ordermin` de Kraken."""
    info = asset_pairs()[pair]
    decimals = int(info["lot_decimals"])
    rounded = math.floor(volume * 10 ** decimals) / 10 ** decimals
    if rounded < float(info.get("ordermin", 0)):
        raise ValueError(f"Volume {rounded:g} sous le minimum Kraken pour {pair} ({info['ordermin']})")
    return f"{rounded:.{decimals}f}"


def _price(pair, price):
    """Prix formaté avec les décimales de la paire (Kraken refuse un prix avec trop de décimales)."""
    return f"{price:.{int(asset_pairs()[pair]['pair_decimals'])}f}"


def _txid(result):
    """Identifiant de l'ordre créé ; None en mode `validate` (aucun ordre n'existe)."""
    ids = result.get("txid")
    return ids[0] if ids else None


def market_order(pair, side, volume, leverage=None, reduce_only=False, validate=False):
    """Ordre au marché ('buy' ou 'sell') ; renvoie son identifiant (txid).

    `leverage` (ex. 2) ouvre ou ferme une position en MARGE (vente à découvert) ; `reduce_only` empêche un ordre de fermeture d'ouvrir
    une position inverse. `validate` fait vérifier l'ordre par Kraken sans l'exécuter.
    """
    params = {"pair": pair, "type": side, "ordertype": "market", "volume": _volume(pair, volume)}
    if leverage:
        params["leverage"] = f"{leverage:g}:1"
    if reduce_only:
        params["reduce_only"] = "true"
    if validate:
        params["validate"] = "true"
    return _txid(_private("AddOrder", **params))


def stop_order(pair, side, volume, kind, level, leverage=None, validate=False):
    """Ordre stop posé chez Kraken (ordre de fermeture, `reduce_only` en marge) ; renvoie son txid.

    `kind` : 'stop-loss' (`level` = prix de déclenchement) ou 'trailing-stop' (`level` = écart en %, suivi par Kraken).
    `side` est le sens de l'ordre : 'sell' pour protéger un long, 'buy' pour protéger un short.
    """
    params = {"pair": pair, "type": side, "ordertype": kind, "volume": _volume(pair, volume),
              "price": _price(pair, level) if kind == "stop-loss" else f"+{level:g}%"}
    if leverage:
        params["leverage"] = f"{leverage:g}:1"
        params["reduce_only"] = "true"
    if validate:
        params["validate"] = "true"
    return _txid(_private("AddOrder", **params))


def cancel_order(txid):
    """Annule un ordre ; sans erreur si Kraken ne le connaît plus (déjà exécuté ou annulé)."""
    try:
        _private("CancelOrder", txid=txid)
    except RuntimeError as e:
        if "Unknown order" not in str(e):
            raise


def order_info(txid):
    """État d'un ordre : status (pending, open, closed, canceled, expired), prix moyen d'exécution, volume exécuté, coût et frais."""
    info = _private("QueryOrders", txid=txid)[txid]
    return {"status": info["status"], "price": float(info.get("price") or 0), "volume": float(info.get("vol_exec") or 0),
            "cost": float(info.get("cost") or 0), "fee": float(info.get("fee") or 0)}


def wait_fill(txid, tries=10, delay=0.6):
    """Attend l'exécution d'un ordre au marché et renvoie ses chiffres réels ; lève RuntimeError s'il est annulé ou trop long."""
    for _ in range(tries):
        info = order_info(txid)
        if info["status"] == "closed":
            return info
        if info["status"] in ("canceled", "expired"):
            raise RuntimeError(f"Ordre {txid} {info['status']} sans exécution")
        time.sleep(delay)
    raise RuntimeError(f"Ordre {txid} non confirmé par Kraken après {tries * delay:.0f} s : vérifie-le sur ton compte")
