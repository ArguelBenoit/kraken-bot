# Kraken Bot — contexte du projet

Bot de trading algorithmique sur **Kraken** (spot, long uniquement, paire contre stablecoin USDC/USDT) avec interface web locale.
Projet perso de l'utilisateur (francophone) : réponds en français, reste concis, et valide avant toute action touchant à de l'argent réel.
Présentation : `README.md`. Détails : `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/STRATEGIES.md`, `docs/TUTORIEL.md`.

## Lancer

    ./run.sh          # dev : API Flask + UI Vite (rechargement à chaud) -> http://127.0.0.1:5173
    ./run.sh prod     # build de l'UI puis un seul serveur -> http://127.0.0.1:5000
    python -m server  # API seule ; python -m server.backtest ETHUSDC rsi

Mode **paper** par défaut (vrais prix, ordres simulés, aucune clé). Le **live** exige `.env` (`KRAKEN_API_KEY`, `KRAKEN_API_SECRET`, droits Query Funds + Create Orders, jamais de retrait).
Après une modif **Python** : relancer le serveur. Les modifs de `web/src` se rechargent seules en dev ; en prod, refaire `./run.sh prod`.

## Structure (résumé — voir docs/ARCHITECTURE.md)

- `server/` : `settings`, `app`, `services` (singletons des 3 bots), `core/` (storage, journal, cache, claude, limits), `market/` (kraken, indicators, strategies, pairs, prices, scan, snapshot),
  `bots/simple/` (config, exits, bot), `bots/ai/` (config, prompt, guards, cost, bot), `bots/manual.py`, `features/` (suggest, learn), `routes/` (un blueprint par domaine), `backtest.py`.
- `web/src/` : `lib/` (logique pure, `types/`, `learn/`), `stores/` (zustand), `hooks/`, `components/` (ui, layout, chart, trade, bot, ai, trading, learn), `pages/`, `styles/theme.css`.
- Données à la racine, ignorées par git : `config.json`, `state.json`, `ai_*.json`, `manual_*.json`, `learn_state.json`.

## Règles de conception

- **Claude propose, le code dispose** : Bot IA et mode IA du bot simple passent par des garde-fous codés ; Claude ne règle jamais montant, frais, mode.
- Une seule implémentation des signaux (`market/strategies.py`) ; le tutoriel en a une copie TS (`lib/learn/methods.ts`) : modifier les deux ensemble.
- Aucun stop chez Kraken : tout est surveillé localement. Live : `confirm:true` exigé côté serveur pour les ordres manuels.
- `/api/connections` n'expose jamais les valeurs des variables d'environnement.
- Ajouter un réglage du bot simple : `bots/simple/config.py` + `lib/fields.ts` + `lib/types/bot.ts` (+ `lib/tips.ts`).
- Ne jamais renvoyer le résultat de `window.scrollTo(...)` depuis un `useEffect` (écran noir).
- Interface : thème sombre monospace, accent `--ac` orange chaud, largeur minimale 1600 px, aucun responsive. Icônes `lucide-react`.
- Code propre : pas de code mort, pas de gros fichiers (découper par fonction), un commentaire sur chaque symbole exporté, **pas de tests** (retirés volontairement, voir commit `888267d`).

## Conventions de travail avec l'utilisateur

- Il demande des ajustements d'interface un par un et vérifie à l'œil : tester le rendu réel sur une **copie isolée** du projet (autre `PORT`, autre dossier),
  **jamais** en écrivant dans le vrai `state.json` / `config.json` (son serveur tourne en parallèle).
- **Ne jamais `pkill -f server`/`app.py`** : arrêter ses propres serveurs de test par PID (port + cwd). Chromium (snap) n'écrit ses captures que sous `~/snap/chromium/common/`.
- Test navigateur : Chromium headless + DevTools (`--remote-debugging-port`) piloté par un script node jetable avec `ws` installé hors du projet ; boutons cliqués par texte exact, apostrophes `’`.
- Commandes web (dans `web/`) : `npm run dev`, `npm run build` (typecheck + build), `npm run typecheck`.
- Ne jamais committer `.env`. Ne pas lancer d'ordres live ni faire de commit/push sans demande explicite.

## Limites connues

Live jamais testé en réel ; prix d'entrée live approximatif ; `ordermin` ignoré ; pas de stop chez Kraken ; bots non redémarrés automatiquement et non coordonnés entre eux ;
720 bougies max par durée (backtests courts, biais de sélection). Idées : stops posés chez Kraken, multi-paires, service systemd, état paper/live séparé.
