# Tutoriel « Apprendre »

Page `/learn` : **100 % paper et 100 % navigateur**, aucun ordre n'est jamais envoyé. Pensé pour un débutant complet.

## Contenu

- **Cours** en 11 leçons (`web/src/lib/learn/content/`), tutoiement, jargon expliqué. Dans les textes : `[[id|texte]]` crée un lien vers le glossaire, `**gras**` met en valeur (`RichText`).
- **Glossaire** cliquable (`glossary.ts`), **quiz** par leçon, **calculette de risque**, **explorateur de bougies**.
- **Simulateur de replay** (`sim.ts`, `PracticeArena`) : un vrai moment passé (`/api/chart`, ≤ 720 bougies) révélé bougie par bougie. 80 bougies par exercice, 1 000 € fictifs,
  frais 0,26 %, stop testé avant l'objectif, gap exécuté à l'ouverture. Pour une méthode, le départ est choisi pour qu'un signal d'achat arrive après au moins 4 bougies calmes ;
  « Aller au prochain signal » saute jusqu'à lui. Un coach (`coach.ts`) commente en direct.
- **Épreuves** (`trials.ts`) : une par méthode (rsi, bollinger, trend, donchian, macd, momentum). Quatre cases : quiz réussi → achat **sur signal** → **stop loss posé** → trade **clôturé**.
  Valider les six donne le « passeport ».

## Présentation en tunnel

Une seule étape à l'écran. `lib/learn/tunnel.ts` (`buildSteps`) découpe chaque leçon selon ses intertitres sans perdre de contenu, puis ajoute Quiz → Épreuve / Exercice → Bilan.
Routes : `/learn` (sommaire + passeport), `/learn/:id/:step`. Le menu **Chapitres** permet de sauter à un chapitre ou de reprendre depuis le début ; flèches ← → du clavier.

## Progression

`GET/PUT /api/learn/progress` → `learn_state.json` (écriture atomique) ; côté interface, le store `learnStore`.

## Cohérence avec le backtest

Les signaux enseignés (`lib/learn/methods.ts`, `indicators.ts`) reproduisent ceux de `server/market/strategies.py` (utilisés par le backtest). Si tu modifies une règle d'un côté, modifie l'autre.
Les anciens tests de comparaison ont été retirés ; ils restent consultables dans le commit `888267d` (`web/src/lib/learn/learn.test.ts`).
