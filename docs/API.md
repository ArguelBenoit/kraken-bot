# API HTTP

Toutes les routes sont sous `/api`, répondent en JSON et sont servies par `server/routes/`. Une erreur renvoie `{"error": "message"}` avec un code 4xx.
Si `APP_PASSWORD` est défini, l'accès hors localhost exige une authentification HTTP Basic.

## Système

| Route | Rôle |
|---|---|
| `GET /api/activity` | Bot IA et trading manuel : positions ouvertes, ordres en attente, combien en gain / en perte (pastilles du menu, sondé toutes les 4 s). |
| `GET /api/connections` | Pour chaque variable d'environnement (`ANTHROPIC_API_KEY`, `KRAKEN_API_KEY`, `KRAKEN_API_SECRET`) : `set` vrai/faux. **Jamais la valeur.** |

## Marché (lecture seule, données publiques Kraken)

| Route | Rôle |
|---|---|
| `GET /api/chart?pair&tf` | Bougies, RSI(14) et repères des trades passés sur la paire (`tf` : 15, 60, 240, 1440). |
| `GET /api/scan?tf` | Tableau Marché : prix, variation 24 h, volume, volatilité, RSI, tendance (écart EMA20 / EMA50, croisement) et %B de Bollinger de chaque paire suivie (cache 60 s). |

## Bot IA

| Route | Rôle |
|---|---|
| `GET /api/ai/status` | Réglages, positions, décisions de Claude, coût et appels du jour. |
| `POST /api/ai/config` | Enregistre les réglages (modèle, agressivité, budget, limites…). |
| `POST /api/ai/start` · `/stop` | Démarre / arrête la surveillance et les analyses. |
| `POST /api/ai/analyze` | Lance une analyse tout de suite. |
| `POST /api/ai/liquidate` | Ferme toutes les positions. |
| `POST /api/ai/close-<id>` | Ferme une position. |
| `POST /api/ai/reset` | Remet l'état à zéro. |

## Trading manuel

| Route | Rôle |
|---|---|
| `GET /api/manual/status?pair=` | Réglages, positions, ordres en attente, journal, cotation (`quote`) de la paire, `claude_ok` (clé Anthropic définie). |
| `POST /api/manual/config` | Réglages (mode, solde paper, montant max…). |
| `POST /api/manual/order` | Ordre d'achat marché ou limite avec `sl` / `tp` / `trail`. En **live**, `confirm: true` est exigé par le serveur. |
| `POST /api/manual/positions/<id>/close` | Vente totale ou partielle (`fraction`). |
| `POST /api/manual/positions/<id>/adjust` | Modifie stop loss / objectif / stop suiveur. |
| `DELETE /api/manual/pending/<id>` | Annule un ordre limite en attente. |
| `POST /api/manual/reset` | Remet l'état à zéro. |
| `POST /api/manual/propose` | Claude propose 0 à 4 presets de trade à prendre maintenant (paire, marché/limite, SL, TP, suiveur, justification). **Rien n'est exécuté** : l'interface pré-remplit le ticket. Un appel à la fois, 10 s entre deux demandes ; le montant n'est jamais proposé. |

## Tutoriel

| Route | Rôle |
|---|---|
| `GET /api/learn/progress` | Quiz réussis et épreuves validées. |
| `PUT /api/learn/progress` | Enregistre la progression (entrée nettoyée côté serveur). |
| `POST /api/learn/reset` | Efface la progression. |

Aucune route du tutoriel ne passe d'ordre.

## Interface

`GET /` et tout chemin non-API servent `web/dist` (build de l'interface) ; sans build, une page « Interface non construite ».
