# Architecture

```
navigateur ── React (web/) ── /api/* ──▶ Flask (server/) ──▶ Kraken (public + ordres signés)
                  │                          │         └────▶ API Anthropic (Bot IA, propositions de trade)
                  └── zustand (état)         └── threads : un par bot, + fichiers JSON d'état à la racine
```

Le serveur Python est la **source de vérité** (positions, stops, état) ; l'interface n'est qu'un client qui interroge l'API
toutes les 3 à 4 secondes. Le tutoriel est l'exception : sa simulation tourne dans le navigateur (seule la progression est
enregistrée côté serveur).

## Backend — `server/`

Lancé par `python -m server` (voir `__main__.py`). Découpé par fonction :

| Dossier / fichier | Rôle |
|---|---|
| `settings.py` | Chemins (racine, `web/dist`), lecture de `.env`, présence des clés d'API. |
| `app.py` | Fabrique Flask : mot de passe optionnel, enregistrement des routes. |
| `services.py` | Le Bot IA et le trader manuel, instanciés une seule fois et partagés par les routes. |
| `core/` | Utilitaires transverses : `storage` (JSON atomique), `journal` (derniers événements), `cache` (mémoïsation courte), `claude` (client Anthropic avec outil), `limits` (bornes). |
| `market/` | `kraken` (client), `indicators` (EMA, RSI), `strategies` (signaux des 6 méthodes, pour le backtest), `pairs` (paires suivies), `prices` (dernier prix en cache), `scan` (tableau Marché), `chart` (bougies + RSI + repères des trades), `snapshot` (résumé chiffré envoyé à Claude). |
| `bots/ai/` | `config`, `prompt` (outil `decide` + prompt), `guards` (garde-fous, fonctions pures), `cost` (estimation du coût), `bot`. |
| `bots/manual.py` | Trading manuel (page d'accueil) : ordres long ou short, marché / limite, stops par position, surveillance. |
| `bots/live.py` | Exécution LIVE du Trading : ordres au marché avec exécution réelle, stop posé chez Kraken, suivi et pose de remplacement. Jamais exécuté en réel. |
| `bots/positions.py` | Calculs purs d'une position selon son sens (stops, liquidation, gains, frais de report) : voir [SHORT](SHORT.md). |
| `features/` | `proposals` (Claude propose des trades à prendre maintenant), `learn` (progression du tutoriel). |
| `routes/` | Un *blueprint* Flask par domaine : `market`, `ai`, `manual`, `learn`, `system`, `spa`. |
| `backtest.py` | Backtest d'une méthode sur l'historique Kraken. |

### Principes

- **Les six méthodes** (RSI, tendance, Bollinger, Donchian, MACD, momentum) sont enseignées par le tutoriel (`web/src/lib/learn/methods.ts`) et testables par le backtest
  (`market/strategies.py`) : si une règle change d'un côté, changer l'autre. Plus aucun bot ne les exécute.
- **Claude propose, le code dispose.** Que ce soit le Bot IA (`bots/ai/guards.py`) ou les propositions de trade (`features/proposals.py`),
  la sortie de Claude est nettoyée et bornée par le code ; le montant, les frais et le mode ne lui sont jamais confiés, et une proposition ne fait que pré-remplir le ticket.
- **Concurrence** : chaque bot a un thread et un verrou (`lock`) : un seul cycle / ordre / liquidation à la fois.
- **Persistance** : un JSON par bot (`config` + `state`), écrit de façon atomique. Paper et live partagent le fichier d'état d'un bot ; le
  changement de mode est refusé si le bot tourne ou si une position est ouverte.
- **Stops** : en paper, simulés par le programme. En live (Trading manuel et Bot IA), le stop loss est posé chez Kraken (`bots/live.py`) ; objectif et ordres limites restent surveillés localement.

### Fichiers de données (racine, ignorés par git)

`ai_config.json` / `ai_state.json` · `manual_config.json` / `manual_state.json` · `learn_state.json`.

## Frontend — `web/src/`

React 19 + TypeScript + Vite. Un thème sombre (`styles/theme.css`) et des CSS modules pour les composants complexes. Largeur minimale
1600 px, aucun responsive, échelle globale 110 % (`--zoom` dans `theme.css`).

| Dossier | Contenu |
|---|---|
| `lib/` | Logique pure, sans React : `api` (fetch typé), `format`, `constants`, `scan`, `trade` (jauge « trade en cours »), `ticket` (aperçu d'un ordre), `activity`, `markers`, `tips`… |
| `lib/types/` | Types partagés avec l'API, par domaine (`market`, `ai`, `manual`, `activity`, `proposal`, `notice`). |
| `lib/learn/` | Tout le tutoriel : `methods`/`indicators` (signaux), `sim` (simulateur), `trials` (épreuves), `tunnel` (découpage en étapes), `coach`, `glossary`, `content/` (leçons par module). |
| `stores/` | État global (zustand) : `aiStore`, `manualStore`, `proposalStore`, `marketStore`, `learnStore`, `activityStore`, `uiStore` (notifications et confirmations) ; `runAction` factorise « appeler l'API, notifier le résultat, recharger ». |
| `hooks/` | `usePolling`, `useTradingSync`, `useReplaySession`, `useDismiss`, `useMaxRowsHeight`. |
| `components/` | `ui/` (Card, Field, Button, Tip…), `layout/` (barre latérale, bandeau), `chart/`, `trade/` (carte « Trade en cours » commune), `market/` (tableau + graphique), `ai/`, `trading/` (ticket, propositions de Claude), `learn/`. |
| `pages/` | Une page par route : `TradingPage` (accueil, route `/`), `AiPage`, `LearnPage`. |

### Conventions

- **Retours d'action** : jamais de `alert` ni `window.confirm`. Succès et échecs d'une action serveur s'affichent en **toast** (`toast.ok / error / info`, `ToastHost`, déjà géré par `runAction`) ; toute action sensible ou irréversible (ordre live, liquidation, reset, passage en live, effacement) demande une **confirmation** (`await confirmAction({ title, message, lines, danger })`, `ConfirmDialog`, focus sur « Annuler » si `danger`). Les messages de validation d'un formulaire restent en ligne.
- **Formulaires** : le brouillon vit dans le store et n'est rempli qu'une fois depuis la config enregistrée (le sondage ne l'écrase jamais) ;
  les propositions de Claude et le bouton « Acheter » du tableau Marché ne font que *pré-remplir* le ticket.
- **« Trade en cours »** : un composant unique (`components/trade/OpenTradeCard`) alimenté par un adaptateur par page
  (`aiTradeInput`, `manualTradeInput` dans `lib/trade.ts`).
- **Pas de calcul dans les composants** quand il peut être pur : on le met dans `lib/` (testable, réutilisable).
- Commentaires en français ; chaque fichier, composant ou fonction exportée porte un commentaire d'une ligne sur son rôle.

## Ajouter…

- **un réglage du trading manuel** : `DEFAULT_CONFIG` / `LIMITS` dans `server/bots/manual.py` → `web/src/lib/types/manual.ts` → `components/trading/ManualSettingsCard.tsx`.
- **un champ aux propositions de Claude** : l'outil et `sanitize` dans `server/features/proposals.py` (le serveur borne tout) → `lib/types/proposal.ts` → `components/trading/ClaudeProposals.tsx`.
- **une méthode de trading** : `server/market/strategies.py` (signal + paramètres par défaut) et `backtest.py` (grille) ; pour le tutoriel : `lib/learn/methods.ts` et sa leçon dans `lib/learn/content/methods.ts`.
- **une page** : une route dans `web/src/App.tsx`, une entrée dans `components/layout/navigation.ts`, une page dans `pages/` ; côté Python, un blueprint dans `server/routes/`.
