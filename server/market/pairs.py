"""Paires surveillées (tableau Marché, Bot IA, suggestion de Claude). Les paires sont des altnames Kraken.

SUI, PEPE, NEAR, INJ, ARB et APT n'ont pas de paire USDC/USDT chez Kraken.
"""

WATCH = [("ETHUSDC", "ETH/USDC"), ("XBTUSDC", "BTC/USDC"), ("SOLUSDC", "SOL/USDC"), ("XRPUSDC", "XRP/USDC"),
         ("AVAXUSDC", "AVAX/USDC"), ("LINKUSDC", "LINK/USDC"), ("ADAUSDC", "ADA/USDC"), ("DOTUSDC", "DOT/USDC"),
         ("XDGUSDC", "DOGE/USDC"), ("SHIBUSDC", "SHIB/USDC"), ("TONUSDC", "TON/USDC"), ("LTCUSDC", "LTC/USDC")]
LABELS = dict(WATCH)
