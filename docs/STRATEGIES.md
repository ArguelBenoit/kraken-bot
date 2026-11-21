# Méthodes de trading

Six méthodes classiques, présentées **en long** (achat), signaux calculés sur les bougies **closes**. Plus aucun bot ne les exécute seul : elles servent à
**apprendre** (tutoriel : leçons, simulateur et épreuves, `web/src/lib/learn/methods.ts`), à **tester** (backtest, `server/market/strategies.py`)
et de vocabulaire commun avec **Claude** (Bot IA et propositions de trade).

| Méthode | Signal d'achat | Sortie typique |
|---|---|---|
| `rsi` | RSI ≤ seuil bas (mean-reversion, 30 par défaut) | RSI ≥ seuil haut, objectif, stop loss |
| `trend` | croisement haussier EMA rapide / lente (20 / 50) | croisement baissier, stop loss, stop suiveur |
| `bollinger` | clôture sous la bande basse (20, 2 écarts-types) | retour à la moyenne, objectif, stop loss |
| `donchian` | cassure du plus haut des 20 bougies précédentes | cassure du plus bas des 10 bougies, stop loss, stop suiveur |
| `macd` | croisement MACD / signal à la hausse (12, 26, 9) | croisement inverse, stop loss, stop suiveur |
| `momentum` | hausse ≥ 3 % sur 24 bougies et RSI < 80 | hausse repassée < 0, stop loss, stop suiveur |

Les paramètres par défaut sont dans `DEFAULT_PARAMS` (`server/market/strategies.py`). Les règles sont **dupliquées** côté interface pour le tutoriel :
si une règle change d'un côté, la modifier de l'autre.

## Trading manuel et propositions de Claude

Sur la page Trading (long ou short, voir [SHORT](SHORT.md)), les stops sont posés **par position** : stop loss, objectif (take profit) et stop suiveur, en % de l'entrée. Ils sont surveillés par
le programme (toutes les 10 s par défaut), **pas chez Kraken**. « Demander à Claude » propose jusqu'à 4 presets à partir d'un résumé chiffré du marché en 4 h
(RSI, EMA 20/50, Bollinger, plus hauts/bas, rendements, volatilité). Le code borne chaque preset : sens long ou short (short seulement s'il est autorisé, levier borné, stop sous la liquidation), stop loss 0,5–10 %, objectif ≥ 1,02 % (au-dessus des frais), suiveur 0,5–10 %,
repli de l'ordre limite 0,3–5 % ; les paires déjà détenues sont exclues et le montant reste à ton choix.

## Bot IA

Claude choisit parmi `rsi_reversion`, `trend_follow`, `breakout`, `momentum`, `bollinger`, mais **le code impose** : 1 à 10 positions, une par paire,
confiance minimale et taille maximale selon l'agressivité, stop loss obligatoire (qui ne s'éloigne jamais), gain/risque minimum net de frais ((TP − frais aller-retour) ÷ (SL + frais aller-retour), frais du long ou du short ; 1,5 par défaut), exposition max, perte journalière max, plafond d'appels par jour. Les shorts (case « Autoriser les shorts », désactivée par défaut, paper et live) s'ajoutent aux achats avec une confiance supérieure de 0,1 et un levier borné (voir [SHORT](SHORT.md)).

### Protection du capital (facultatif, tout désactivé par défaut)

Garde-fous du code (`bots/ai/guards.py`), réglables dans le bloc « Protection du capital » du Bot IA et du backtest, pour ne pas dépendre de l'humeur du modèle :

| Réglage | Effet |
|---|---|
| Filtre de tendance | refuse un achat si EMA20 < EMA50 de la paire, un short si EMA20 > EMA50 |
| Positions max dans le même sens | plafonne les achats d'un côté, les shorts de l'autre (les cryptos bougent ensemble) |
| Disjoncteur | plus aucune ouverture si l’équité perd X % depuis son plus haut des N derniers jours (3 par défaut) ; le blocage se lève quand ce plus haut sort de la fenêtre |
| Température | rend les réponses du modèle plus répétables (0 = quasi déterministe) |

## Backtest du Bot IA

La page `/backtest` rejoue le prompt et les garde-fous réels sur les 720 dernières bougies (voir [API](API.md)). Hypothèses : le modèle ne voit que les bougies closes, l'ordre s'exécute à l'ouverture de la bougie, le stop passe avant l'objectif dans une même bougie, pas de glissement de prix. Par défaut les 720 dernières bougies de Kraken ; avec une **date de fin** (ou les boutons Hausse / Baisse / Sans tendance, qui ne règlent que cette date), une période passée lue chez Binance en USDT (substitut des prix Kraken, paires inexistantes à cette date écartées) : un même marché se rejoue à l'identique, ce qui permet de comparer des réglages. Elle teste la mécanique, pas la rentabilité : un seul régime de marché, peu de trades, modèle non déterministe ; compare à « buy & hold » et répète les essais.

## Backtest des méthodes

```bash
python -m server.backtest ETHUSDC rsi
python -m server.backtest ETHUSDC <bollinger|donchian|macd|momentum|trend> [frais] [filtre_ema]
```

Limites : Kraken ne renvoie que **720 bougies** par durée (≈ 48 jours en 4 h), frais taker 0,26 % par ordre. Constats : en 1 h presque rien n'est rentable ;
en 1 j on perd comme le prix ; **4 h, RSI 7, achat 30-35, vente 65-70** est la seule zone un peu positive, avec peu de trades.
Les réglages « gagnants » trouvés par recherche sur 200+ combinaisons souffrent d'un biais de sélection : ne rien en conclure sans plusieurs semaines de paper.
