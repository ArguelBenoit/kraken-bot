"""Blueprints Flask, un par domaine fonctionnel."""
from . import ai, learn, manual, simple, spa, system

BLUEPRINTS = (simple.bp, ai.bp, manual.bp, learn.bp, system.bp, spa.bp)      # spa en dernier : route fourre-tout
