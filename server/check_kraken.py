"""Vérification SANS RISQUE de ce que Kraken accepte sur ton compte : chaque ordre est envoyé avec `validate=true` (Kraken le contrôle, ne l'exécute jamais).

    python -m server.check_kraken [PAIRE]        # défaut : XBTUSDC

À lancer avant d'utiliser le live. Teste : achat au marché, stop loss, stop suiveur, short en marge ×2 et rachat `reduce_only`. Les clés
KRAKEN_API_KEY / KRAKEN_API_SECRET sont lues dans `.env` et jamais affichées.
"""
import sys
import time

from server import settings
from server.market import kraken


def _ordermin(pair):
    return float(kraken.asset_pairs()[pair].get("ordermin", 0)) * 1.5      # un peu au-dessus du minimum de la paire


def main(pair):
    settings.load_dotenv()
    if not settings.kraken_configured():
        sys.exit("KRAKEN_API_KEY / KRAKEN_API_SECRET absentes de .env")
    price = kraken.last_price(pair)
    vol = _ordermin(pair)
    info = kraken.asset_pairs()[pair]
    print(f"{pair} : prix {price:g}, volume de test {vol:g}, marge vendeuse possible : {info.get('leverage_sell') or 'aucune'}")
    tests = [
        ("achat au marché", lambda: kraken.market_order(pair, "buy", vol, validate=True)),
        ("stop loss (vente)", lambda: kraken.stop_order(pair, "sell", vol, "stop-loss", price * 0.95, validate=True)),
        ("stop suiveur (vente)", lambda: kraken.stop_order(pair, "sell", vol, "trailing-stop", 3, validate=True)),
        ("short ×2 : vente à découvert", lambda: kraken.market_order(pair, "sell", vol, leverage=2, validate=True)),
        ("short ×2 : stop loss de rachat", lambda: kraken.stop_order(pair, "buy", vol, "stop-loss", price * 1.05, leverage=2, validate=True)),
        ("short ×2 : rachat reduce_only", lambda: kraken.market_order(pair, "buy", vol, leverage=2, reduce_only=True, validate=True)),
    ]
    for name, run in tests:
        try:
            run()
            print(f"  OK     {name}")
        except Exception as e:
            print(f"  REFUSÉ {name} -> {e}")
        time.sleep(1.1)       # nonce croissant : une requête par milliseconde ne suffit pas à éviter un rejet


if __name__ == "__main__":
    main(sys.argv[1].upper() if len(sys.argv) > 1 else "XBTUSDC")
