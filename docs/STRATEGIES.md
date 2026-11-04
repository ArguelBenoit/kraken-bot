# Méthodes de trading

Toutes les méthodes sont **long uniquement**, ordres **au marché**, **une seule position** à la fois (bot simple). Les signaux sont calculés
sur les bougies **closes** (`server/market/strategies.py`) ; stops et objectifs sont évalués à chaque cycle (`check_every`) avec le prix courant.
Les règles de sortie sont dans `server/bots/simple/exits.py`.

| Méthode | Achat | Sortie |
|---|---|---|
| `rsi` | RSI ≤ `rsi_buy` (mean-reversion) | take profit, stop loss, ou RSI ≥ `rsi_sell` |
| `trend` | croisement haussier EMA `ma_fast` / `ma_slow` | croisement baissier, stop loss, stop suiveur `trailing_pct` |
| `bollinger` | clôture sous la bande basse (`bb_period`, `bb_std`) | retour à la moyenne, take profit, stop loss |
| `donchian` | cassure du plus haut des `dc_entry` bougies | cassure du plus bas des `dc_exit` bougies, stop loss, stop suiveur |
| `macd` | croisement MACD / signal à la hausse | croisement inverse, stop loss, stop suiveur |
| `momentum` | hausse ≥ `mom_min_pct` % sur `mom_period` bougies et RSI < 80 | hausse repassée < 0, stop loss, stop suiveur |

## Options communes

- **Filtre de tendance** (`filter_ema`, `filter_tf`) : n'achète que si le cours est au-dessus de l'EMA(N), calculée sur une autre durée de bougie (confirmation multi-timeframe). Non appliqué au tableau Marché.
- **Stop ATR** (`atr_stop`) : stop = prix d'entrée − N × ATR(14), mémorisé à l'achat (`stop_px`) ; remplace le stop loss en %.
- **Stop suiveur** (`trailing_pct`) : suit le plus haut atteint depuis l'achat (0 = désactivé).
- La position ouverte est suivie sur **sa propre paire** et garde les règles de sortie de la méthode **active**.
- Après une sortie par signal baissier (tendance), pas de rachat sur la même bougie.

## Bot IA

Claude choisit parmi `rsi_reversion`, `trend_follow`, `breakout`, `momentum`, `bollinger`, mais **le code impose** : 1 à 5 positions, une par paire,
confiance minimale et taille maximale selon l'agressivité, stop loss obligatoire, exposition max, perte journalière max, plafond d'appels par jour.

## Backtest

```bash
python -m server.backtest ETHUSDC rsi
python -m server.backtest ETHUSDC <bollinger|donchian|macd|momentum|trend> [frais] [filtre_ema]
```

Limites : Kraken ne renvoie que **720 bougies** par durée (≈ 48 jours en 4 h), frais taker 0,26 % par ordre. Constats : en 1 h presque rien n'est rentable ;
en 1 j on perd comme le prix ; **4 h, RSI 7, achat 30-35, vente 65-70** est la seule zone un peu positive, avec peu de trades.
Les réglages « gagnants » trouvés par recherche sur 200+ combinaisons souffrent d'un biais de sélection : ne rien en conclure sans plusieurs semaines de paper.
