# Kraken Bot — contexte du projet

Bot de trading algorithmique **RSI en mean-reversion** entre un **stablecoin (USDC/USDT)** et une crypto sur **Kraken**,
avec une interface web locale pour régler et surveiller. Projet perso de l'utilisateur (francophone) :
réponds en français, reste concis, et valide avant toute action touchant à de l'argent réel.

## Lancer

    ./run.sh          # développement : API Flask + UI React (Vite, rechargement à chaud) -> http://127.0.0.1:5173
    ./run.sh prod     # build de l'UI puis un seul serveur Flask -> http://127.0.0.1:5000

`run.sh` installe tout au premier lancement (venv Python + `requirements.txt`, `npm install` dans `web/`). Prérequis : Python 3, Node ≥ 20.
`python app.py` seul sert l'API et le build `web/dist` s'il existe (sinon une page « Interface non construite »).

Mode **paper** par défaut (vrais prix Kraken, ordres simulés, aucune clé). Le mode **live** exige `.env`
(`KRAKEN_API_KEY`, `KRAKEN_API_SECRET`, droits Query Funds + Create Orders, jamais de retrait). Voir `.env.example`.
Après une modif **Python** : relancer (Ctrl+C puis `./run.sh`). Les modifs de l'UI (`web/src`) se rechargent seules en dev ; en prod, refaire `./run.sh prod`.

## Architecture

| Fichier | Rôle |
|---|---|
| `app.py` | Flask : routes + chargement de `.env`. |
| `bot.py` | Classe `Bot` : boucle (thread), stratégie, ordres, état, presets épinglés, scan du marché, données du graphique. |
| `kraken.py` | Client Kraken : public (OHLC, Ticker) et privé signé HMAC (`AddOrder` au marché). |
| `ai_bot.py` | Classe `AIBot` (page `/ai`) : Claude analyse le marché toutes les N min et ouvre/ferme jusqu'à 5 positions. Garde-fous appliqués par le code. |
| `backtest.py` | Backtest RSI sur l'historique Kraken (`python backtest.py ETHUSDC`), `trend`, et les 4 nouvelles méthodes. |
| `strategies.py` | Signaux purs des méthodes Bollinger / Donchian / MACD / Momentum (`signal()`), ATR, filtre de tendance : partagés par le bot, le scan et le backtest. |
| `indicators.py` | `ema_series`, `rsi_series` (ré-exportés par `bot.py`). |
| `web/` | Interface **React + TypeScript** (Vite, zustand, lightweight-charts, lucide-react) : voir section « Interface ». |
| `run.sh` | Lance tout en une commande (dev ou `prod`). |
| `config.json` | Réglages enregistrés (créé au 1er « Enregistrer »). Ignoré par git. |
| `state.json` | État runtime : `cash, qty, entry, pair, cost, pnl, trades[≤200], presets[]`. Ignoré par git. |

Config ajoutée : `strategy, ma_fast, ma_slow, trailing_pct` (dans `PIN_FIELDS`, donc épinglés / copiés-collés).

Routes : `GET /api/status`, `GET /api/chart?pair&tf`, `GET /api/scan?tf`, `POST /api/config`, `POST /api/presets`,
`DELETE /api/presets/<id>`, `POST /api/{start|stop|liquidate|reset}`.

## Bot IA (ai_bot.py, page /ai)

Indépendant du bot simple : fichiers `ai_config.json` / `ai_state.json` (ignorés par git), son propre cash paper (`budget`).
Appel direct à l'API Messages (`requests`, `ANTHROPIC_API_KEY` dans `.env`, modèle réglable) avec un outil forcé `decide`
(actions `open` / `close` / `adjust`). Claude ne fait que **proposer** : `_apply` impose max 1-5 positions, une par paire, confiance minimale
et taille max selon l'agressivité (`PROFILES`), stop loss obligatoire, exposition max, perte journalière max, plafond d'appels/jour.
SL / TP / stop suiveur sont surveillés localement (`_monitor`, toutes les `check_every` s) ; Claude n'est appelé que toutes les `interval_min` min
(ou via « Analyser maintenant »). Stratégies exposées à Claude : `STRATEGIES` (rsi_reversion, trend_follow, breakout, momentum, bollinger).
Routes : `GET /ai`, `GET /api/ai/status`, `POST /api/ai/config`, `POST /api/ai/{start|stop|analyze|liquidate|reset|close-<id>}`.
**Testé uniquement en paper avec Kraken/Claude simulés** ; live jamais testé, mêmes limites que le bot simple (pas de stop chez Kraken, `ordermin` ignoré).
Ne pas faire tourner bot simple et bot IA en live sur le même compte sans y penser : ils ne se coordonnent pas.

## Stratégie (bot.py)

Deux méthodes, choix dans Réglages > Méthode (`config["strategy"]` = `rsi` | `trend`). Les champs de l'autre méthode sont masqués
(classes `.m-rsi` / `.m-trend`, `syncStrat()` dans le JS). La position ouverte garde ses règles de sortie selon la méthode **active**.

**Tendance (`_tick_trend`)** : EMA rapide/lente (`ma_fast`/`ma_slow`) sur les bougies closes. Achat sur **croisement haussier** de la
dernière bougie close ; sortie sur croisement baissier, `stop_loss_pct` fixe ou stop suiveur `trailing_pct` depuis `state["peak"]`
(0 = off). Pas de take profit. `state["trend_block"]` empêche de racheter sur la bougie de la sortie. Backtest : `python backtest.py ETHUSDC trend [frais]`
(résultats non concluants : trop peu de trades sur 720 bougies, aucun preset tendance fourni). Le graphique trace les 2 EMA, le tableau Marché
affiche Haussier/Baissier/Croisement et se trie par croisement puis écart EMA, la jauge du trade en cours va du stop effectif au pic.

**Méthodes à signaux (`_tick_signal`, `strategies.py`)** : `bollinger` (achat sous la bande basse, vente à la moyenne, TP + SL),
`donchian` (achat sur cassure du plus haut de `dc_entry` bougies, vente sous le plus bas de `dc_exit`, SL + stop suiveur),
`macd` (croisement MACD/signal, SL + stop suiveur), `momentum` (hausse ≥ `mom_min_pct` sur `mom_period` bougies et RSI < 80, vente si la hausse repasse < 0, SL + suiveur).
Options **communes à toutes les méthodes** : filtre de tendance `filter_ema` (achat seulement si cours > EMA(N), sur `filter_tf` = confirmation multi-timeframe ;
non appliqué au tableau Marché) et `atr_stop` (stop = entrée − N×ATR(14) mémorisé dans `state["stop_px"]`, remplace le stop en %).
Backtest : `python backtest.py ETHUSDC <bollinger|donchian|macd|momentum> [frais] [filtre_ema]`. Non encore évaluées sur la durée : à tester en paper.
Non implémentées : grille et DCA (incompatibles avec « une seule position », voir branche `feature/bot-ia` pour le multi-positions), rotation entre paires.

**RSI** (méthode d'origine) :

- Long-only, **une seule position à la fois**, ordres **au marché**.
- Achat si RSI ≤ `rsi_buy` (sur la dernière bougie **close**). Sorties testées dans cet ordre : take profit, stop loss, RSI ≥ `rsi_sell`.
- TP / SL sont évalués à **chaque analyse** (`check_every`) avec le prix courant, le RSI ne change qu'à la clôture d'une bougie.
- Si un seuil est dépassé pendant que le bot était arrêté, il vend **au prix du moment** dès le 1er cycle.
- La position ouverte est **toujours suivie sur sa propre paire** (`state["pair"]`), même si la paire des réglages change ;
  la nouvelle paire ne sert qu'au prochain achat. Les anciennes positions sans `pair` prennent la paire des réglages au démarrage.
- Verrou `tlock` (RLock) autour d'un cycle / d'une liquidation / d'un reset ; `lock` pour config et état.
- Paires = **altname Kraken** (`XBTUSDC`, pas BTC ; `XDGUSDC` pour DOGE). Liste surveillée : `WATCH` dans `bot.py`.
  SUI, PEPE, NEAR, INJ, ARB, APT n'ont pas de paire USDC/USDT chez Kraken.

## Interface (web/)

React 19 + TypeScript + Vite ; **l'API Flask n'a pas changé** (toutes les routes `/api/*` sont identiques). Vite proxifie `/api` vers Flask (`PORT`, 5000 par défaut).
Deux pages (react-router) : `/` Bot simple, `/ai` Bot IA, menu en haut à droite, même bandeau (`components/layout/Header.tsx`).

    web/src/
      lib/        types, api (fetch typé), format, constants, fields (formulaire piloté par données), presets, tips,
                  scan / trade / markers / configIO = logique pure testée (lib.test.ts, `npm test`)
      stores/     zustand : botStore (statut + brouillon du formulaire + actions), marketStore (tableau, graphique, bougie), aiStore
      hooks/      usePolling, useBotSync (orchestration : sondage 3 s, graphique 60 s, recharge si méthode/trade change), useDismiss, useMaxRowsHeight
      components/ ui/ (Card, Field, Button, Tip, ModeSwitch, StatusBadge, Notice, LogCard) · layout/ · bot/ · ai/ · chart/PriceChart
      pages/      BotPage, AiPage          styles/theme.css  (jetons + primitives), CSS modules pour les composants complexes

- Thème sombre « oldschool » inchangé : monospace, rayon 2 px, accent ambre `--ac`, vert/rouge gains/pertes (variables dans `styles/theme.css`).
- Formulaire des réglages : défini par `FORM_ROWS` (`lib/fields.ts`) ; un champ n'apparaît que pour les méthodes de `only`. Ajouter un réglage =
  `DEFAULT_CONFIG`/`LIMITS` côté Python + une entrée dans `fields.ts` + son type dans `types.ts` + (option) son infobulle dans `tips.ts`.
- Le brouillon du formulaire vit dans le store : il n'est rempli qu'une fois depuis la config enregistrée (le sondage ne l'écrase jamais) ;
  « Restaurer » le remet sur la config enregistrée. Presets / Trader / collage JSON ne font que **pré-remplir** (rien n'est enregistré).
- Largeur minimale 1600 px (`body{min-width}`), **aucun responsive** : en dessous, la page déborde du viewport sans se réorganiser.
- Marché : 8 lignes visibles, trié selon la méthode, le sélecteur « Bougie » pilote tableau **et** graphique, **Trader** pré-remplit le formulaire.
- Presets : intégrés (`lib/presets.ts`, issus de backtests : biais de sélection) + **configs épinglées** dans `state.json["presets"]`.
- Icônes : `lucide-react` (`<Settings className="ic" />`, `ic f` pour les pleines). Aucun asset à copier.
- Commandes (dans `web/`) : `npm run dev`, `npm run build` (typecheck + build), `npm test`, `npm run typecheck`.

## Résultats de backtest et décisions (31/10/2026)

- Données Kraken : **720 bougies max** par timeframe → ~48 jours de test en 4 h. Frais taker 0,26 % par ordre (≈ 0,5 % l'aller-retour).
- **1 h : presque rien de rentable**. **1 j : perd comme le prix.** **4 h, RSI 7, achat 30-35, vente 65-70** : seule zone un peu positive.
- Les presets viennent de configs positives à l'entraînement **et** au test avec assez de trades, mais choisies parmi 200+ combinaisons
  par crypto → **biais de sélection, résultats optimistes**. Aucune rentabilité garantie ; recommandé : plusieurs semaines en paper avant le live.
- Presets (tous 4 h, paper, préfixés RSI · / EMA · dans le popover) : RSI = ETH équilibré/patient, XRP, SHIB, BTC, SOL x2, AVAX x2, LINK ; EMA = BTC, SOL, LINK, ADA.
  Les presets EMA viennent d'un grid (train>0 et test>0) mais avec 3 à 5 trades de test : très fragiles, à observer en paper. « Trader » (tableau) choisit un preset de la méthode active.

## Limites et risques connus

- **Le live n'a jamais été testé avec de l'argent réel.** Le prix d'entrée y est approximatif (dernier prix, pas le prix exécuté) ;
  le volume minimum Kraken (`ordermin`) est ignoré.
- **Aucun stop chez Kraken** : TP/SL n'existent que dans le programme. Si `app.py` s'arrête (terminal fermé, veille, coupure),
  rien ne vend. Le bot **ne redémarre pas tout seul** : il faut cliquer sur Démarrer.
- Paper et live **partagent `state.json`** ; le changement de mode est bloqué si le bot tourne ou si une position est ouverte. Changer de paire est autorisé (voir plus haut).
- Les presets épinglés vivent dans `state.json` : supprimer ce fichier les efface (un fichier séparé serait plus robuste).
- Écriture de `state.json` non atomique ; une seule instance du programme à la fois sur un compte.

## Reste à faire (idées discutées)

1. Stop loss / take profit **posés chez Kraken** (ordres conditionnels, `close[...]`, tester avec `validate=true`) + vérifier le solde réel au démarrage en live.
2. **Multi-paires** : un bot par paire, état séparé, plafond d'exposition global.
3. Redémarrage automatique du bot s'il tournait + lancement en arrière-plan (service systemd).
4. Bloquer le changement de **mode** avec une position ouverte ; séparer l'état paper / live ; déplacer les presets épinglés dans leur propre fichier.
5. Filtre de tendance (ex. pas d'achat sous la moyenne mobile 200) ou stratégie en grille ; tri du tableau Marché combinant RSI et volatilité.

## Conventions de travail avec l'utilisateur

- Il demande des ajustements d'interface un par un et vérifie à l'œil : tester le rendu réel (Chrome headless `--screenshot` ou
  `--dump-dom`) sur une **copie isolée** du projet (copier les `.py` et `web/dist` dans un dossier temporaire, lancer avec un autre `PORT`),
  **jamais** en écrivant dans le vrai `state.json` / `config.json` (son serveur tourne en parallèle et garde l'état en mémoire).
- **Ne jamais `pkill -f app.py`** : le serveur réel de l'utilisateur est aussi `app.py` (port 5000). Arrêter ses propres serveurs de test par PID (port + cwd).
  Chromium (snap) ne peut écrire ses captures que sous `~/snap/chromium/common/`.
- Ne jamais committer `.env`. Ne pas lancer d'ordres live ni faire de commit/push sans demande explicite.
