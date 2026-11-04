"""Blueprints Flask, un par domaine fonctionnel."""
from . import ai, learn, manual, market, spa, system

BLUEPRINTS = (market.bp, ai.bp, manual.bp, learn.bp, system.bp, spa.bp)      # spa en dernier : route fourre-tout
