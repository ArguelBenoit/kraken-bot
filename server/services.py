"""Instances uniques des trois bots, partagées par toutes les routes (chacun gère son propre état et sa propre boucle)."""
from server.bots.ai.bot import AIBot
from server.bots.manual import ManualTrader
from server.bots.simple.bot import Bot

bot = Bot()
ai = AIBot()
manual = ManualTrader()
