import base64, hashlib, hmac, os, time, urllib.parse
import requests

BASE = "https://api.kraken.com"


def public(method, **params):
    r = requests.get(f"{BASE}/0/public/{method}", params=params, timeout=15)
    r.raise_for_status()
    d = r.json()
    if d.get("error"):
        raise RuntimeError(", ".join(d["error"]))
    return d["result"]


def candles(pair, interval):
    """Retourne la liste des clôtures (la dernière bougie, en cours, est exclue)."""
    res = public("OHLC", pair=pair, interval=interval)
    key = next(k for k in res if k != "last")
    return [float(c[4]) for c in res[key][:-1]]


def last_price(pair):
    res = public("Ticker", pair=pair)
    return float(next(iter(res.values()))["c"][0])


def private(method, **params):
    key, secret = os.getenv("KRAKEN_API_KEY"), os.getenv("KRAKEN_API_SECRET")
    if not key or not secret:
        raise RuntimeError("KRAKEN_API_KEY / KRAKEN_API_SECRET manquants dans .env")
    path = f"/0/private/{method}"
    params["nonce"] = str(int(time.time() * 1000))
    data = urllib.parse.urlencode(params)
    msg = path.encode() + hashlib.sha256((params["nonce"] + data).encode()).digest()
    sig = base64.b64encode(hmac.new(base64.b64decode(secret), msg, hashlib.sha512).digest()).decode()
    r = requests.post(BASE + path, data=data, headers={"API-Key": key, "API-Sign": sig}, timeout=15)
    r.raise_for_status()
    d = r.json()
    if d.get("error"):
        raise RuntimeError(", ".join(d["error"]))
    return d["result"]


def market_order(pair, side, volume):
    return private("AddOrder", pair=pair, type=side, ordertype="market", volume=f"{volume:.8f}")


def ohlc(pair, interval):
    """Bougies complètes [(time, open, high, low, close)], la dernière (en cours) incluse."""
    res = public("OHLC", pair=pair, interval=interval)
    key = next(k for k in res if k != "last")
    return [(int(c[0]), float(c[1]), float(c[2]), float(c[3]), float(c[4])) for c in res[key]]
