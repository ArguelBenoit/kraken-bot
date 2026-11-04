"""Instances uniques des bots, partagées par toutes les routes (chacun gère son propre état et sa propre boucle)."""
from server.bots.ai.bot import AIBot
from server.bots.manual import ManualTrader

ai = AIBot()
manual = ManualTrader()
