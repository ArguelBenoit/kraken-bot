# Kraken Bot

Plateforme locale de trading crypto sur **Kraken** (spot, long uniquement, paire contre stablecoin USDC/USDT) : du **trading manuel
assisté par Claude**, un bot piloté par **Claude**, et un **tutoriel interactif** pour apprendre. Tout tourne sur ta machine,
en **paper trading** (vrais prix, ordres simulés) par défaut.

> ⚠ Trader est risqué. Ce projet est une expérimentation personnelle : aucune rentabilité n'est garantie, ce n'est pas un conseil financier.
> Le mode **live** n'a jamais été testé avec de l'argent réel et **aucun stop n'est posé chez Kraken** : si le programme s'arrête, rien ne vend.

## Ce que fait le projet

| Page | Rôle |
|---|---|
| **Trading** (accueil) | Tu passes tes ordres à la main (marché ou limite) avec stop loss, take profit et stop suiveur par position ; plusieurs positions ; aperçu du risque avant d'envoyer. **« Demander à Claude »** propose quelques trades à prendre maintenant (paire, entrée, stops) : un clic les pré-remplit dans le ticket, rien n'est envoyé sans ta validation. |
| **Bot IA** | Claude analyse le marché à intervalle régulier et gère jusqu'à 5 positions en parallèle. Claude ne fait que *proposer* : stops, tailles, exposition et perte journalière sont imposés par le code. |
| **Tutoriel** | 100 % simulation, pour débutant complet : leçons en « tunnel », glossaire cliquable, quiz, et un simulateur qui rejoue de vrais moments du marché. 6 épreuves (une par méthode) à valider. |

Le menu latéral montre en direct quels bots tournent, si des positions sont ouvertes (⚡ vert / rouge / orange selon les gains et pertes)
et quelles clés d'API sont définies.

## Démarrage rapide

Prérequis : **Python 3** et **Node ≥ 20**.

```bash
./run.sh          # développement : API + interface avec rechargement à chaud → http://127.0.0.1:5173
./run.sh prod     # build de l'interface puis un seul serveur            → http://127.0.0.1:5000
```

Au premier lancement, `run.sh` crée le venv Python, installe `requirements.txt` et fait `npm install`. Après une modification du code
**Python**, relance (`Ctrl+C` puis `./run.sh`) : le serveur garde son code en mémoire.

## Configuration (`.env`)

Copie `.env.example` en `.env`. Toutes les variables sont facultatives : sans clé, tout fonctionne en paper.

| Variable | Pour quoi faire |
|---|---|
| `ANTHROPIC_API_KEY` | Bot IA et propositions de trade de la page Trading (appels payants à l'API Anthropic). |
| `KRAKEN_API_KEY`, `KRAKEN_API_SECRET` | Mode **live** uniquement. Droits *Query Funds* + *Create Orders*, **jamais de retrait**. |
| `HOST`, `PORT` | Adresse d'écoute (défaut `127.0.0.1:5000`). |
| `APP_PASSWORD` | Mot de passe (HTTP Basic) exigé hors localhost. À définir dès que `HOST=0.0.0.0`. |

Le bas du menu indique quelles variables sont définies (jamais leur valeur).

## Structure du dépôt

```
server/      API Python (Flask) : marché, bots, routes        → docs/ARCHITECTURE.md
web/         Interface React + TypeScript (Vite, zustand)     → docs/ARCHITECTURE.md
docs/        Architecture, API, méthodes de trading, tutoriel
run.sh       Lance tout en une commande
```

Les réglages et états (`ai_*.json`, `manual_*.json`, `learn_state.json`) sont créés à la racine ;
ils sont ignorés par git.

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — organisation du code, flux de données, conventions, comment ajouter une page / un réglage / une méthode.
- [API](docs/API.md) — toutes les routes HTTP.
- [Méthodes de trading](docs/STRATEGIES.md) — règles des 6 méthodes (tutoriel, Bot IA, backtest) et limites du backtest.
- [Tutoriel](docs/TUTORIEL.md) — conception pédagogique, épreuves, simulateur.

## Développement

```bash
cd web
npm run dev          # interface seule (nécessite l'API sur :5000)
npm run build        # contrôle des types + build de production
python -m server     # API seule (depuis la racine)
python -m server.backtest ETHUSDC rsi    # backtest d'une méthode (outil de recherche)
```

## Limites connues

- Live jamais testé avec de l'argent réel ; prix d'entrée approximatif (dernier prix, pas le prix exécuté) ; volume minimum Kraken ignoré.
- Stops, objectifs et ordres limites sont surveillés **par ce programme** (contrôle toutes les 10 à 30 s), pas posés chez Kraken.
- Les bots ne redémarrent pas seuls et ne se coordonnent pas : ne pas les faire tourner en live en même temps sur le même compte.
- Kraken ne fournit que 720 bougies par durée : les backtests sont courts et les résultats optimistes (biais de sélection).
