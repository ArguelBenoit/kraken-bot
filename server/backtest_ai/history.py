"""Bougies plus anciennes pour rejouer un marché passé (hausse, baisse, range) : API publique de Binance (sans clé), paires contre USDT.
Kraken ne renvoie que les 720 dernières bougies ; les prix de Binance sont très proches pour les grandes cryptos mais restent un substitut."""
import requests

URL = "https://data-api.binance.vision/api/v3/klines"
INTERVALS = {15: "15m", 60: "1h", 240: "4h", 1440: "1d"}
BASES = {"XBT": "BTC", "XDG": "DOGE"}             # noms Kraken -> noms Binance
TIMEOUT = 20


def symbol(pair):
    """Symbole Binance d'une paire Kraken (ETHUSDC -> ETHUSDT, XBTUSDC -> BTCUSDT)."""
    base = pair.removesuffix("USDC")
    return BASES.get(base, base) + "USDT"


def candles(pair, tf, end_ts, count):
    """Les `count` dernières bougies terminées avant `end_ts` (secondes) : [temps (s), ouverture, haut, bas, clôture]. Liste vide si la paire n'existait pas encore."""
    r = requests.get(URL, params={"symbol": symbol(pair), "interval": INTERVALS[tf], "endTime": int(end_ts * 1000) - 1, "limit": count}, timeout=TIMEOUT)
    if r.status_code == 400:                       # symbole inconnu (paire absente de Binance)
        return []
    r.raise_for_status()
    return [[row[0] // 1000, float(row[1]), float(row[2]), float(row[3]), float(row[4])] for row in r.json() if row[6] < end_ts * 1000]
