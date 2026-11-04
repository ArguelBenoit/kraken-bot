# Kraken Bot (RSI, crypto/stablecoin)

Bot de mean-reversion : achète quand le RSI passe sous un seuil, vend sur RSI haut, take profit ou stop loss.
Long-only, une position à la fois, ordres au marché.

    ./run.sh             # une seule commande (Python 3 + Node ≥ 20) : http://127.0.0.1:5173
    ./run.sh prod        # build puis un seul serveur : http://127.0.0.1:5000

- **Paper** (défaut) : prix réels Kraken, ordres simulés, aucune clé requise.
- **Live** : copier `.env.example` en `.env`, y mettre une clé API (Query Funds + Create Orders, sans retrait).
  Le live n'a pas été testé avec de l'argent réel : commence avec une petite taille d'ordre.
