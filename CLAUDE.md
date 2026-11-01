# Kraken Bot — contexte du projet

Bot de trading algorithmique **RSI en mean-reversion** entre un **stablecoin (USDC/USDT)** et une crypto sur **Kraken**,
avec une interface web locale pour régler et surveiller. Projet perso de l'utilisateur (francophone) :
réponds en français, reste concis, et valide avant toute action touchant à de l'argent réel.

## Lancer

    python3 -m venv .venv && . .venv/bin/activate
    pip install -r requirements.txt
    python app.py            # http://127.0.0.1:5000

Mode **paper** par défaut (vrais prix Kraken, ordres simulés, aucune clé). Le mode **live** exige `.env`
(`KRAKEN_API_KEY`, `KRAKEN_API_SECRET`, droits Query Funds + Create Orders, jamais de retrait). Voir `.env.example`.
Après une modif du code : relancer le serveur (Ctrl+C puis `python app.py`) puis Ctrl+Maj+R dans le navigateur.

## Architecture

| Fichier | Rôle |
|---|---|
| `app.py` | Flask : routes + chargement de `.env`. |
| `bot.py` | Classe `Bot` : boucle (thread), stratégie, ordres, état, presets épinglés, scan du marché, données du graphique. |
| `kraken.py` | Client Kraken : public (OHLC, Ticker) et privé signé HMAC (`AddOrder` au marché). |
| `backtest.py` | Backtest RSI sur l'historique Kraken (`python backtest.py ETHUSDC`). |
| `templates/index.html` | Toute l'UI (HTML + CSS + JS dans un seul fichier). |
| `static/` | `lightweight-charts.js` (TradingView 4.1.3, local) et `icons.svg` (sprite Lucide 0.468.0, ISC). |
| `config.json` | Réglages enregistrés (créé au 1er « Enregistrer »). Ignoré par git. |
| `state.json` | État runtime : `cash, qty, entry, pair, cost, pnl, trades[≤200], presets[]`. Ignoré par git. |

Routes : `GET /api/status`, `GET /api/chart?pair&tf`, `GET /api/scan?tf`, `POST /api/config`, `POST /api/presets`,
`DELETE /api/presets/<id>`, `POST /api/{start|stop|liquidate|reset}`.

## Stratégie (bot.py)

- Long-only, **une seule position à la fois**, ordres **au marché**.
- Achat si RSI ≤ `rsi_buy` (sur la dernière bougie **close**). Sorties testées dans cet ordre : take profit, stop loss, RSI ≥ `rsi_sell`.
- TP / SL sont évalués à **chaque analyse** (`check_every`) avec le prix courant, le RSI ne change qu'à la clôture d'une bougie.
- Si un seuil est dépassé pendant que le bot était arrêté, il vend **au prix du moment** dès le 1er cycle.
- La position ouverte est **toujours suivie sur sa propre paire** (`state["pair"]`), même si la paire des réglages change ;
  la nouvelle paire ne sert qu'au prochain achat. Les anciennes positions sans `pair` prennent la paire des réglages au démarrage.
- Verrou `tlock` (RLock) autour d'un cycle / d'une liquidation / d'un reset ; `lock` pour config et état.
- Paires = **altname Kraken** (`XBTUSDC`, pas BTC ; `XDGUSDC` pour DOGE). Liste surveillée : `WATCH` dans `bot.py`.
  SUI, PEPE, NEAR, INJ, ARB, APT n'ont pas de paire USDC/USDT chez Kraken.

## Interface (templates/index.html)

- Thème sombre « oldschool » : monospace, rayon 2 px, accent ambre `--ac`, vert/rouge pour gains/pertes.
- Disposition 2 colonnes (max 1600 px). **Gauche = trading** : Réglages, Trades, Journal. **Droite = observation** :
  Trade en cours (masqué sans position, avec le bouton Liquider dans son titre), puis Marché + Graphique dans une seule carte.
  Header : titre + Mode (switch PAPER/LIVE, confirmation vers LIVE, refusé si bot en marche ou position ouverte) / Statut / PnL réalisé / Équité (paper seulement). Éléments `.po` = paper seulement (Capital paper, Reset paper), Trades filtrés sur le mode courant (côté `snapshot`). Statut : vert clignotant (EN COURS) / rouge (ARRÊTÉ).
- Tableau Marché : 8 lignes visibles (le reste défile), **trié par RSI croissant**, la ligne du graphique affiché est surlignée.
  Le sélecteur « Bougie » pilote tableau **et** graphique. Le bouton **Trader** d'une ligne pré-remplit le formulaire
  (sans enregistrer, sans scroller) avec le preset de la paire s'il existe.
- Presets : popover (bouton dans le titre de Réglages), boutons qui pré-remplissent seulement, rien n'est « sélectionné ».
  Presets fournis = `PRESETS` + `BUILTIN` dans le JS. **Configs épinglées** (📌 Épingler = config *enregistrée*) stockées dans
  `state.json["presets"]`, supprimables avec ✕ ; le reset paper les conserve. Bouton « Restaurer » = remet le formulaire sur `config.json`.
- Pastilles `?` (tooltips) générées par `TIPS` / `KPI_TIPS` dans le JS. Icônes : `ic('nom')` en JS ou
  `<svg class="ic"><use href="/static/icons.svg#nom"/></svg>` ; pour en ajouter : télécharger le SVG depuis
  `cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/<nom>.svg` et l'ajouter comme `<symbol>` dans `static/icons.svg`.
- **Piège Jinja** : le fichier est un template Flask. N'écris jamais `{#`, `{{` ou `{%` dans le CSS/JS (ex. `{#run{…}` fait planter
  la page en erreur 500) : mettre un espace (`{ #run`).
- Piège JS : `LABELS` est défini plus bas dans le script — ne pas l'utiliser à l'initialisation avant sa définition.

## Résultats de backtest et décisions (31/10/2026)

- Données Kraken : **720 bougies max** par timeframe → ~48 jours de test en 4 h. Frais taker 0,26 % par ordre (≈ 0,5 % l'aller-retour).
- **1 h : presque rien de rentable**. **1 j : perd comme le prix.** **4 h, RSI 7, achat 30-35, vente 65-70** : seule zone un peu positive.
- Les presets viennent de configs positives à l'entraînement **et** au test avec assez de trades, mais choisies parmi 200+ combinaisons
  par crypto → **biais de sélection, résultats optimistes**. Aucune rentabilité garantie ; recommandé : plusieurs semaines en paper avant le live.
- Presets : ETH 4h équilibré/patient, XRP et SHIB prudents, SOL et AVAX modérés, LINK risqué, AVAX agressif (tous 4 h, paper).

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
  `--dump-dom`) sur une **copie isolée** du projet (copier `app.py bot.py kraken.py templates static` dans un dossier temporaire),
  **jamais** en écrivant dans le vrai `state.json` / `config.json` (son serveur tourne en parallèle et garde l'état en mémoire).
- Ne jamais committer `.env`. Ne pas lancer d'ordres live ni faire de commit/push sans demande explicite.
