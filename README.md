# Kraken Bot

Plateforme locale de trading crypto sur **Kraken** (spot, paire contre stablecoin USDC/USDT ; long, et short en marge) : du **trading manuel
assisté par un modèle d'IA**, un bot piloté par un modèle d'IA (Claude, GPT, Gemini, Mistral, Groq, DeepSeek, Grok, OpenRouter…), et un **tutoriel interactif** pour apprendre. Tout tourne sur ta machine,
en **paper trading** (vrais prix, ordres simulés) par défaut.

> ⚠ Trader est risqué. Ce projet est une expérimentation personnelle : aucune rentabilité n'est garantie, ce n'est pas un conseil financier.
> Le mode **live** n'a jamais été testé avec de l'argent réel et les stops loss (ou suiveurs) posés chez Kraken n'ont jamais été vérifiés en réel ; les objectifs et ordres limites restent locaux.

## Ce que fait le projet

| Page | Rôle |
|---|---|
| **Trading** (accueil) | Tu passes tes ordres à la main, **long** (achat) ou **short** (vente à découvert en marge, levier ×2 à ×5), au marché ou en limite, avec stop loss, take profit et stop suiveur par position ; plusieurs positions ; aperçu du risque avant d'envoyer. **« Demander à Claude »** propose quelques trades à prendre maintenant (paire, entrée, stops) : un clic les pré-remplit dans le ticket, rien n'est envoyé sans ta validation. |
| **Bot IA** | Le modèle analyse le marché à intervalle régulier et gère jusqu'à 5 positions en parallèle. Il ne fait que *proposer* : stops, tailles, exposition et perte journalière sont imposés par le code. |
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
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY` | Clé du fournisseur de modèle choisi (une seule suffit ; **Ollama** = modèle local sans clé, adresse dans `OLLAMA_URL`, contexte dans `OLLAMA_NUM_CTX`). Le Bot IA et les propositions de la page Trading ont chacun leur choix de fournisseur et de modèle, mémorisé. Appels payants chez le fournisseur ; plafond d'appels par jour (champ vide = illimité). |
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
- [Stops chez Kraken](docs/KRAKEN_STOPS.md) — ce qui est posé chez Kraken en live, cycle de vie, limites.
- [Short et marge](docs/SHORT.md) — fonctionnement, formules, risques et marche à suivre avant le live.
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

- **Short** : simulé en paper (garantie, frais de marge et de report, liquidation estimée). En live il est **désactivé par défaut** : la marge Kraken n'a jamais été validée sur un compte réel (voir `docs/SHORT.md`).
- Live jamais testé avec de l'argent réel (le Trading lit désormais le prix et le volume réellement exécutés et respecte `ordermin` ; le Bot IA garde encore l'approximation).
- **Live** : le stop loss (ou à défaut le stop suiveur) du Trading est posé **chez Kraken** ; l'objectif, le stop suiveur d'un trade qui a aussi un stop loss, les ordres limites et tout le Bot IA restent surveillés **par ce programme** (contrôle toutes les 10 à 30 s). Ce chemin live n'a jamais été exécuté (voir `docs/SHORT.md` et `python -m server.check_kraken`).
- Les bots ne redémarrent pas seuls et ne se coordonnent pas : ne pas les faire tourner en live en même temps sur le même compte.
- Kraken ne fournit que 720 bougies par durée : les backtests sont courts et les résultats optimistes (biais de sélection).
