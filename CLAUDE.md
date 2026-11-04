# Kraken Bot — contexte du projet

Plateforme de trading sur **Kraken** (spot, paire contre stablecoin USDC/USDT ; long, et short en marge dans le Trading manuel) avec interface web locale : trading manuel (accueil) assisté par Claude, Bot IA, tutoriel.
Projet perso de l'utilisateur (francophone) : réponds en français, reste concis, et valide avant toute action touchant à de l'argent réel.
Présentation : `README.md`. Détails : `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/STRATEGIES.md`, `docs/TUTORIEL.md`.

## Lancer

    ./run.sh          # dev : API Flask + UI Vite (rechargement à chaud) -> http://127.0.0.1:5173
    ./run.sh prod     # build de l'UI puis un seul serveur -> http://127.0.0.1:5000
    python -m server  # API seule ; python -m server.backtest ETHUSDC rsi

Mode **paper** par défaut (vrais prix, ordres simulés, aucune clé). Le **live** exige `.env` (`KRAKEN_API_KEY`, `KRAKEN_API_SECRET`, droits Query Funds + Create Orders, jamais de retrait).
Après une modif **Python** : relancer le serveur. Les modifs de `web/src` se rechargent seules en dev ; en prod, refaire `./run.sh prod`.

## Structure (résumé — voir docs/ARCHITECTURE.md)

- `server/` : `settings`, `app`, `services` (singletons Bot IA + trader manuel), `core/` (storage, journal, cache, claude, limits), `market/` (kraken, indicators, strategies [backtest], pairs, prices, scan, chart, snapshot),
  `bots/ai/` (config, prompt, guards, cost, bot), `bots/manual.py` (+ `manual_config.py`), `bots/positions.py` (calculs long/short), `bots/live.py` (ordres et stops Kraken), `features/` (proposals, learn), `routes/` (un blueprint par domaine), `backtest.py`.
- `web/src/` : `lib/` (logique pure, `types/`, `learn/`), `stores/` (zustand), `hooks/`, `components/` (ui, layout, chart, trade, bot, ai, trading, learn), `pages/`, `styles/theme.css`.
- Données à la racine, ignorées par git : `ai_*.json`, `manual_*.json`, `learn_state.json`.

## Règles de conception

- **Claude propose, le code dispose** : Bot IA et propositions de trade (`features/proposals.py`, qui ne font que pré-remplir le ticket) passent par des garde-fous codés ; Claude ne règle jamais montant, frais, mode.
- Les six méthodes ne sont plus exécutées par un bot : tutoriel (`lib/learn/methods.ts`) et backtest (`market/strategies.py`) en ont chacun une copie, à modifier ensemble.
- **Short** (Trading manuel seulement) : paper simulé, live désactivé par défaut (`allow_live_short`), marge Kraken jamais validée ; stop loss obligatoire. Détails : `docs/SHORT.md`. Le Bot IA reste long uniquement.
- **Stops** : en paper tout est simulé localement. En live (Trading manuel), `bots/live.py` pose le stop loss (sinon le stop suiveur) chez Kraken (`stop-loss` / `trailing-stop`, `reduce_only` en marge), le suit et le repose s'il disparaît ; objectif et ordres limites restent locaux. **Jamais exécuté sur un compte réel** : vérifier avec `python -m server.check_kraken` (`validate=true`). Bot IA : stops encore locaux. Live : `confirm:true` exigé côté serveur pour les ordres manuels.
- `/api/connections` n'expose jamais les valeurs des variables d'environnement.
- Le Trading est la page d'accueil (`/`) ; le bot simple a été supprimé (voir l'historique git si besoin).
- Ne jamais renvoyer le résultat de `window.scrollTo(...)` depuis un `useEffect` (écran noir).
- Interface : thème sombre monospace, accent `--ac` orange chaud, largeur minimale 1600 px, aucun responsive, échelle globale 110 % (`--zoom` dans `theme.css`, qui compense aussi les unités `vh`). Icônes `lucide-react`.
- Code propre : pas de code mort, pas de gros fichiers (découper par fonction), un commentaire sur chaque symbole exporté, **pas de tests** (retirés volontairement, voir commit `888267d`).

## Conventions de travail avec l'utilisateur

- Il demande des ajustements d'interface un par un et vérifie à l'œil : tester le rendu réel sur une **copie isolée** du projet (autre `PORT`, autre dossier),
  **jamais** en écrivant dans le vrai `state.json` / `config.json` (son serveur tourne en parallèle).
- **Ne jamais `pkill -f server`/`app.py`** : arrêter ses propres serveurs de test par PID (port + cwd). Chromium (snap) n'écrit ses captures que sous `~/snap/chromium/common/`.
- Test navigateur : Chromium headless + DevTools (`--remote-debugging-port`) piloté par un script node jetable avec `ws` installé hors du projet ; boutons cliqués par texte exact, apostrophes `’`.
- Commandes web (dans `web/`) : `npm run dev`, `npm run build` (typecheck + build), `npm run typecheck`.
- Ne jamais committer `.env`. Ne pas lancer d'ordres live ni faire de commit/push sans demande explicite.

## Limites connues

Live jamais testé en réel ; Bot IA : prix d'entrée approximatif, `ordermin` ignoré (le client Kraken arrondit les volumes et refuse sous `ordermin`), stops locaux ; bots non redémarrés automatiquement et non coordonnés entre eux ;
720 bougies max par durée (backtests courts, biais de sélection). Idées : stops Kraken pour le Bot IA, short pour le Bot IA, service systemd, état paper/live séparé.
