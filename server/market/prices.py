"""Dernier prix d'une paire avec un cache de quelques secondes, partagé par toute l'application."""
from server.core.cache import memo, memo_or_stale
from . import kraken


def last_price(pair, max_age=3.0):
    """Prix à `max_age` secondes près (0 = toujours frais). Lève une exception si Kraken ne répond pas."""
    return memo(("px", pair), max_age, lambda: kraken.last_price(pair))


def try_last_price(pair, max_age=4.0):
    """Comme `last_price`, mais renvoie la dernière valeur connue (ou None) si Kraken ne répond pas."""
    return memo_or_stale(("px", pair), max_age, lambda: kraken.last_price(pair))
