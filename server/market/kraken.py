"""Client de l'API Kraken : données publiques (bougies, prix) et ordres signés (HMAC) au marché.

Les paires sont désignées par leur « altname » Kraken (XBTUSDC, pas BTC ; XDGUSDC pour DOGE).
"""
import base64
import hashlib
import hmac
import os
import time
import urllib.parse

import requests

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


def market_order(pair, side, volume):
    """Ordre au marché ('buy' ou 'sell'). Aucun stop n'est posé chez Kraken : tout est surveillé par ce programme."""
    return _private("AddOrder", pair=pair, type=side, ordertype="market", volume=f"{volume:.8f}")
