# API HTTP

Toutes les routes sont sous `/api`, répondent en JSON et sont servies par `server/routes/`. Une erreur renvoie `{"error": "message"}` avec un code 4xx.
Si `APP_PASSWORD` est défini, l'accès hors localhost exige une authentification HTTP Basic.

## Système

| Route | Rôle |
|---|---|
| `GET /api/activity` | Bot IA et trading manuel : positions ouvertes, ordres en attente, combien en gain / en perte (pastilles du menu, sondé toutes les 4 s). |
| `GET /api/models/<fournisseur>` | Modèles utilisables avec la clé du fournisseur (API `/models`, mémorisée 10 min, modèles non conversationnels écartés). Sans clé ou en échec : quelques exemples, `source: "examples"` et `notice`. |
| `GET /api/connections` | Pour chaque variable d'environnement (clés des fournisseurs de modèles, `KRAKEN_API_KEY`, `KRAKEN_API_SECRET`) : `set` vrai/faux. **Jamais la valeur.** |

## Marché (lecture seule, données publiques Kraken)

| Route | Rôle |
|---|---|
| `GET /api/chart?pair&tf` | Bougies, RSI(14) et repères des trades passés sur la paire (`tf` : 15, 60, 240, 1440). |
| `GET /api/scan?tf` | Tableau Marché : prix, variation 24 h, volume, volatilité, RSI, tendance (écart EMA20 / EMA50, croisement) et %B de Bollinger de chaque paire suivie (cache 60 s). |

## Bot IA

| Route | Rôle |
|---|---|
| `GET /api/ai/status` | Réglages, positions, décisions du modèle, appels et tokens du jour, `options.providers` (fournisseurs, modèles d'exemple, clé définie ou non). |
| `POST /api/ai/config` | Enregistre les réglages (modèle, agressivité, budget, limites…). |
| `POST /api/ai/start` · `/stop` | Démarre / arrête la surveillance et les analyses. |
| `POST /api/ai/analyze` | Lance une analyse tout de suite. |
| `POST /api/ai/liquidate` | Ferme toutes les positions. |
| `POST /api/ai/close-<id>` | Ferme une position. |
| `POST /api/ai/reset` | Remet l'état à zéro. |

## Trading manuel

| Route | Rôle |
|---|---|
| `GET /api/manual/status?pair=` | Réglages, positions, ordres en attente, journal, cotation (`quote`) de la paire, `llm_ok` (clé du fournisseur choisi définie), `providers`. Le fournisseur et le modèle des propositions sont dans `config` (`provider`, `model`). |
| `POST /api/manual/config` | Réglages (mode, solde paper, montant max, levier max, frais de marge et de report, `allow_live_short`…). |
| `POST /api/manual/order` | Ordre d'ouverture : `side` (`long` par défaut ou `short`), `leverage` (short : 2 à `max_leverage`), `type` marché ou limite (`limit_price`), `size`, `sl_pct` / `tp_pct` / `trail_pct`. Un short exige un stop loss inférieur à la distance de liquidation ; en live il exige aussi `allow_live_short`. En **live**, `confirm: true` est exigé par le serveur. |
| `POST /api/manual/positions/<id>/close` | Fermeture totale ou partielle (`fraction`) : vente d'un long, rachat d'un short. |
| `POST /api/manual/positions/<id>/adjust` | Modifie stop loss / objectif / stop suiveur. |
| `DELETE /api/manual/pending/<id>` | Annule un ordre limite en attente. |
| `POST /api/manual/reset` | Remet l'état à zéro. |
| `POST /api/manual/propose` | Le modèle choisi (config manuelle) propose 0 à 4 presets de trade à prendre maintenant (paire, long ou short, levier, marché/limite, SL, TP, suiveur, justification). **Rien n'est exécuté** : l'interface pré-remplit le ticket. Un appel à la fois, 10 s entre deux demandes ; le montant n'est jamais proposé. |

## Tutoriel

| Route | Rôle |
|---|---|
| `GET /api/learn/progress` | Quiz réussis et épreuves validées. |
| `PUT /api/learn/progress` | Enregistre la progression (entrée nettoyée côté serveur). |
| `POST /api/learn/reset` | Efface la progression. |

Aucune route du tutoriel ne passe d'ordre.

## Interface

`GET /` et tout chemin non-API servent `web/dist` (build de l'interface) ; sans build, une page « Interface non construite ».
