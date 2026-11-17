"""Bougies plus anciennes pour rejouer un marché passé (hausse, baisse, sans tendance) : API publique de Binance (sans clé), paires contre USDT.
Kraken ne renvoie que les 720 dernières bougies ; les prix de Binance sont très proches pour les grandes cryptos mais restent un substitut.
Chaque marché téléchargé est gardé dans `data/scenarios/` (un fichier par date de fin et par bougie) : il se rejoue ensuite à l'identique, sans réseau."""
import gzip
import json
import os
import time

import requests

from server import settings

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


def _file(tf, end_ts):
    return settings.data_file("scenarios") / f"{time.strftime('%Y-%m-%d', time.gmtime(end_ts))}_{tf}.json.gz"


def _read(path):
    try:
        with gzip.open(path, "rt") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def period(pairs, tf, end_ts, count):
    """{paire: bougies} d'une période passée : lues sur le disque, les paires manquantes étant téléchargées puis ajoutées au fichier (une paire absente de Binance à cette date y est notée vide)."""
    path = _file(tf, end_ts)
    path.parent.mkdir(exist_ok=True)
    saved = _read(path)
    missing = [p for p in pairs if p not in saved]
    for pair in missing:
        saved[pair] = candles(pair, tf, end_ts, count)
    if missing:
        tmp = path.with_name(path.name + ".tmp")
        with gzip.open(tmp, "wt") as f:
            json.dump(saved, f, separators=(",", ":"))
        os.replace(tmp, path)
    return {p: saved[p] for p in pairs}
