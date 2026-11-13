"""Blueprints Flask, un par domaine fonctionnel."""
from . import ai, backtest, learn, manual, market, spa, system

BLUEPRINTS = (market.bp, ai.bp, backtest.bp, manual.bp, learn.bp, system.bp, spa.bp)      # spa en dernier : route fourre-tout
