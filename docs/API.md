# API HTTP

Toutes les routes sont sous `/api`, répondent en JSON et sont servies par `server/routes/`. Une erreur renvoie `{"error": "message"}` avec un code 4xx.
Si `APP_PASSWORD` est défini, l'accès hors localhost exige une authentification HTTP Basic.

## Système

| Route | Rôle |
|---|---|
| `GET /api/activity` | Bots en marche, positions ouvertes, combien en gain / en perte (pastilles du menu, sondé toutes les 4 s). |
| `GET /api/connections` | Pour chaque variable d'environnement (`ANTHROPIC_API_KEY`, `KRAKEN_API_KEY`, `KRAKEN_API_SECRET`) : `set` vrai/faux. **Jamais la valeur.** |

## Bot simple

| Route | Rôle |
|---|---|
| `GET /api/status` | Réglages, état, position, journal, indicateurs. |
| `GET /api/chart?pair&tf` | Bougies, indicateurs et marqueurs de trades pour le graphique. |
| `GET /api/scan?tf` | Tableau Marché : signal de chaque paire suivie selon la méthode active. |
| `POST /api/config` | Enregistre les réglages (validés et bornés côté serveur). |
| `POST /api/start` · `/stop` | Démarre / arrête la boucle. |
| `POST /api/liquidate` | Vend la position ouverte au marché. |
| `POST /api/reset` | Remet l'état à zéro (cash, position, historique). |
| `POST /api/suggest` | `{lock_pair}` : Claude propose un réglage ; **rien n'est enregistré**, l'interface pré-remplit le formulaire. |

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
| `GET /api/manual/status?pair=` | Réglages, positions, ordres en attente, journal, cotation (`quote`) de la paire. |
| `POST /api/manual/config` | Réglages (mode, solde paper, montant max…). |
| `POST /api/manual/order` | Ordre d'achat marché ou limite avec `sl` / `tp` / `trail`. En **live**, `confirm: true` est exigé par le serveur. |
| `POST /api/manual/positions/<id>/close` | Vente totale ou partielle (`fraction`). |
| `POST /api/manual/positions/<id>/adjust` | Modifie stop loss / objectif / stop suiveur. |
| `DELETE /api/manual/pending/<id>` | Annule un ordre limite en attente. |
| `POST /api/manual/reset` | Remet l'état à zéro. |

## Tutoriel

| Route | Rôle |
|---|---|
| `GET /api/learn/progress` | Quiz réussis et épreuves validées. |
| `PUT /api/learn/progress` | Enregistre la progression (entrée nettoyée côté serveur). |
| `POST /api/learn/reset` | Efface la progression. |

Aucune route du tutoriel ne passe d'ordre.

## Interface

`GET /` et tout chemin non-API servent `web/dist` (build de l'interface) ; sans build, une page « Interface non construite ».
