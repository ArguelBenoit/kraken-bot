"""Mémoïsation à durée de vie courte : évite de re-solliciter Kraken à chaque requête de l'interface."""
import time

_store = {}


def memo(key, ttl, compute):
    """Valeur en cache si elle a moins de `ttl` secondes, sinon `compute()` (ses erreurs se propagent)."""
    hit = _store.get(key)
    now = time.time()
    if hit and now - hit[0] < ttl:
        return hit[1]
    value = compute()
    _store[key] = (now, value)
    return value


def memo_or_stale(key, ttl, compute, default=None):
    """Comme `memo`, mais si `compute()` échoue renvoie la dernière valeur connue (ou `default`)."""
    try:
        return memo(key, ttl, compute)
    except Exception:
        hit = _store.get(key)
        return hit[1] if hit else default
