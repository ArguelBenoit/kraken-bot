"""Réglages du bot simple : valeurs par défaut, bornes et validation."""
from server.core.limits import check_limits
from server.market.strategies import METHODS

DEFAULT_CONFIG = {
    "pair": "XBTUSDC",          # crypto + stablecoin (altname Kraken)
    "mode": "paper",            # paper | live
    "strategy": "rsi",          # une des méthodes de strategies.METHODS
    "timeframe": 15,            # minutes : 1, 5, 15, 30, 60, 240, 1440
    "rsi_period": 14,           # rsi : période, achat si RSI <= rsi_buy, vente si RSI >= rsi_sell
    "rsi_buy": 30,
    "rsi_sell": 70,
    "take_profit_pct": 2.0,     # rsi et bollinger : objectif en %
    "stop_loss_pct": 1.5,       # toutes méthodes : perte maximale en %
    "order_size": 100.0,        # en stablecoin par achat
    "fee_pct": 0.26,            # frais taker Kraken (estimation)
    "ma_fast": 20,              # trend : EMA rapide / lente (en bougies)
    "ma_slow": 50,
    "instant_entry": 0,         # trend : 1 = achète tout de suite si EMA rapide > lente (sans attendre un croisement)
    "trailing_pct": 5.0,        # méthodes sans take profit : stop suiveur depuis le plus haut (0 = désactivé)
    "check_every": 30,          # secondes entre deux analyses
    "paper_balance": 1000.0,    # capital de départ du paper trading
    "bb_period": 20,            # bollinger : période de la moyenne et nombre d'écarts-types
    "bb_std": 2.0,
    "dc_entry": 20,             # donchian : achat si cassure du plus haut des N bougies précédentes
    "dc_exit": 10,              # donchian : vente si cassure du plus bas des N bougies précédentes
    "macd_fast": 12,            # macd : EMA rapide, lente et du signal
    "macd_slow": 26,
    "macd_signal": 9,
    "mom_period": 24,           # momentum : hausse mesurée sur N bougies, achat si >= mom_min_pct
    "mom_min_pct": 3.0,
    "filter_ema": 0,            # filtre de tendance (toutes méthodes) : achat seulement si cours > EMA(N). 0 = désactivé
    "filter_tf": 0,             # timeframe du filtre (0 = celui de la stratégie, sinon 15 / 60 / 240 / 1440)
    "atr_stop": 0.0,            # stop = prix d'entrée − N × ATR(14) à la place du stop loss en % (0 = désactivé)
}

# Réglages que l'interface (et la suggestion de Claude) peut modifier : tout sauf le mode et le capital paper.
CONFIG_FIELDS = [k for k in DEFAULT_CONFIG if k not in ("mode", "paper_balance")]

LIMITS = {
    "order_size": (5, 100000), "rsi_period": (2, 100), "rsi_buy": (1, 50), "rsi_sell": (50, 99),
    "take_profit_pct": (0.1, 50), "stop_loss_pct": (0.1, 50), "check_every": (10, 3600),
    "ma_fast": (2, 200), "ma_slow": (5, 400), "trailing_pct": (0, 50),
    "bb_period": (5, 200), "bb_std": (0.5, 4), "dc_entry": (5, 200), "dc_exit": (2, 100),
    "macd_fast": (2, 100), "macd_slow": (5, 200), "macd_signal": (2, 50),
    "mom_period": (2, 200), "mom_min_pct": (0, 100), "filter_ema": (0, 400), "filter_tf": (0, 1440), "atr_stop": (0, 10),
}
FILTER_TFS = (0, 15, 60, 240, 1440)


def merge(current, new):
    """Réglage actuel + valeurs reçues (converties au type de leur valeur par défaut)."""
    cfg = dict(current)
    for key, default in DEFAULT_CONFIG.items():
        if key not in new:
            continue
        value = new[key]
        if key == "pair":
            cfg[key] = str(value).strip().upper()
        elif key == "strategy":
            cfg[key] = str(value).strip().lower()
        elif key == "mode":
            cfg[key] = value
        else:
            cfg[key] = type(default)(value)
    return cfg


def check(cfg):
    """Vérifie la cohérence d'un réglage complet ; lève ValueError avec un message affichable."""
    if cfg["strategy"] not in METHODS:
        raise ValueError("méthode invalide")
    if cfg["mode"] not in ("paper", "live"):
        raise ValueError("mode invalide")
    if cfg["ma_fast"] >= cfg["ma_slow"]:
        raise ValueError("ma_fast doit être < ma_slow")
    if cfg["macd_fast"] >= cfg["macd_slow"]:
        raise ValueError("macd_fast doit être < macd_slow")
    if cfg["filter_tf"] not in FILTER_TFS:
        raise ValueError("filter_tf doit valoir 0, 15, 60, 240 ou 1440")
    check_limits(cfg, LIMITS)
    if cfg["rsi_buy"] >= cfg["rsi_sell"]:
        raise ValueError("rsi_buy doit être < rsi_sell")
