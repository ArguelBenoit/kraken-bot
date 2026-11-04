# Architecture

```
navigateur ── React (web/) ── /api/* ──▶ Flask (server/) ──▶ Kraken (public + ordres signés)
                  │                          │         └────▶ API Anthropic (Bot IA, mode IA, suggestion)
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
| `services.py` | Les trois bots, instanciés une seule fois et partagés par les routes. |
| `core/` | Utilitaires transverses : `storage` (JSON atomique), `journal` (derniers événements), `cache` (mémoïsation courte), `claude` (client Anthropic avec outil), `limits` (bornes). |
| `market/` | `kraken` (client), `indicators` (EMA, RSI, ATR…), `strategies` (signaux des 6 méthodes), `pairs` (paires suivies), `prices` (dernier prix en cache), `scan` (tableau Marché), `snapshot` (résumé chiffré envoyé à Claude). |
| `bots/simple/` | `config` (réglages, bornes, validation), `exits` (règles de sortie, fonctions pures), `bot` (boucle, ordres, état). |
| `bots/ai/` | `config`, `prompt` (outil `decide` + prompt), `guards` (garde-fous, fonctions pures), `cost` (estimation du coût), `bot`. |
| `bots/manual.py` | Trading manuel : ordres marché / limite, stops par position, surveillance. |
| `features/` | `suggest` (mode IA du bot simple), `learn` (progression du tutoriel). |
| `routes/` | Un *blueprint* Flask par domaine : `simple`, `ai`, `manual`, `learn`, `system`, `spa`. |
| `backtest.py` | Backtest d'une méthode sur l'historique Kraken. |

### Principes

- **Une seule implémentation des signaux** (`market/strategies.py`) pour le bot, le scan du marché et le backtest. Le tutoriel en reproduit
  les règles côté interface (`web/src/lib/learn/methods.ts`) : si une règle change d'un côté, changer l'autre.
- **Claude propose, le code dispose.** Que ce soit le Bot IA (`bots/ai/guards.py`) ou la suggestion de réglage (`features/suggest.py`),
  la sortie de Claude est validée par les mêmes bornes que la saisie manuelle ; le montant, les frais et le mode ne lui sont jamais confiés.
- **Concurrence** : chaque bot a un thread et deux verrous — `tlock` (un seul cycle / ordre / liquidation à la fois) et `lock` (réglages et état).
- **Persistance** : un JSON par bot (`config` + `state`), écrit de façon atomique. Paper et live partagent le fichier d'état d'un bot ; le
  changement de mode est refusé si le bot tourne ou si une position est ouverte.
- **Aucun stop chez Kraken** : tout est surveillé par le programme. Les ordres live ne sont envoyés qu'au marché.

### Fichiers de données (racine, ignorés par git)

`config.json` / `state.json` (bot simple) · `ai_config.json` / `ai_state.json` · `manual_config.json` / `manual_state.json` · `learn_state.json`.

## Frontend — `web/src/`

React 19 + TypeScript + Vite. Un thème sombre (`styles/theme.css`) et des CSS modules pour les composants complexes. Largeur minimale
1600 px, aucun responsive.

| Dossier | Contenu |
|---|---|
| `lib/` | Logique pure, sans React : `api` (fetch typé), `format`, `constants`, `fields` (formulaire piloté par données), `scan`, `trade` (jauge « trade en cours »), `ticket` (aperçu d'un ordre), `activity`, `summary`, `markers`, `tips`… |
| `lib/types/` | Types partagés avec l'API, par domaine (`bot`, `ai`, `manual`, `activity`, `suggestion`, `notice`). |
| `lib/learn/` | Tout le tutoriel : `methods`/`indicators` (signaux), `sim` (simulateur), `trials` (épreuves), `tunnel` (découpage en étapes), `coach`, `glossary`, `content/` (leçons par module). |
| `stores/` | État global (zustand) : `botStore`, `aiStore`, `manualStore`, `marketStore`, `learnStore`, `activityStore` ; `runAction` factorise « appeler l'API, afficher le résultat, recharger ». |
| `hooks/` | `usePolling`, `useBotSync`, `useTradingSync`, `useReplaySession`, `useDismiss`, `useMaxRowsHeight`. |
| `components/` | `ui/` (Card, Field, Button, Tip…), `layout/` (barre latérale, bandeau), `chart/`, `trade/` (carte « Trade en cours » commune), `bot/`, `ai/`, `trading/`, `learn/`. |
| `pages/` | Une page par route : `BotPage`, `AiPage`, `TradingPage`, `LearnPage`. |

### Conventions

- **Formulaires** : le brouillon vit dans le store et n'est rempli qu'une fois depuis la config enregistrée (le sondage ne l'écrase jamais) ;
  « Restaurer » le remet à l'état enregistré ; presets, bouton « Trader » et proposition de Claude ne font que *pré-remplir*.
- **« Trade en cours »** : un composant unique (`components/trade/OpenTradeCard`) alimenté par un adaptateur par bot
  (`botTradeInput`, `aiTradeInput`, `manualTradeInput` dans `lib/trade.ts`).
- **Pas de calcul dans les composants** quand il peut être pur : on le met dans `lib/` (testable, réutilisable).
- Commentaires en français ; chaque fichier, composant ou fonction exportée porte un commentaire d'une ligne sur son rôle.

## Ajouter…

- **un réglage du bot simple** : `server/bots/simple/config.py` (valeur par défaut, bornes) → `web/src/lib/fields.ts` (champ du formulaire)
  → `web/src/lib/types/bot.ts` → (option) infobulle dans `lib/tips.ts`.
- **une méthode de trading** : `server/market/strategies.py` (signal + nombre minimal de bougies), `exits.py` si ses sorties diffèrent, `backtest.py` (grille),
  `web/src/lib/fields.ts` + `constants.ts` ; pour le tutoriel : `lib/learn/methods.ts` et sa leçon dans `lib/learn/content/methods.ts`.
- **une page** : une route dans `web/src/App.tsx`, une entrée dans `components/layout/navigation.ts`, une page dans `pages/` ; côté Python, un blueprint dans `server/routes/`.
