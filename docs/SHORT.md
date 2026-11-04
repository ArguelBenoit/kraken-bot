# Short (vente à découvert en marge)

Le **Trading** permet de parier sur la baisse : on emprunte de la crypto, on la vend, puis on la rachète. Sur Kraken spot, cela passe par la **marge** : le même `AddOrder`
avec un paramètre `leverage` (ex. `2:1`). Les positions long (achat sans levier) fonctionnent comme avant.

## Ce qui est implémenté

| | Long | Short |
|---|---|---|
| Ordre d'ouverture | achat | vente à découvert (`leverage`) |
| Gain quand le prix… | monte | baisse |
| Stop loss | sous l'entrée | **au-dessus** de l'entrée (obligatoire) |
| Take profit | au-dessus | en dessous |
| Stop suiveur | sous le plus haut | au-dessus du plus bas |
| Ordre limite | achat si prix ≤ limite | vente si prix ≥ limite |
| Risque | la mise | **peut dépasser la mise** ; liquidation |

Les calculs sont dans `server/bots/positions.py` (fonctions pures), le flux d'ordres dans `server/bots/manual.py`, l'aperçu du ticket dans `web/src/lib/ticket.ts`.

## Modèle paper (estimations)

- **Montant** = valeur vendue à découvert (`size`). **Garantie** immobilisée = `size / levier`, retirée du cash puis rendue à la fermeture, gains et pertes inclus.
- **Frais** : taker Kraken (0,26 %) à l'ouverture et à la fermeture, **frais d'ouverture de marge** (`margin_fee_pct`, 0,02 %), **report** (`rollover_pct`, 0,02 % du montant par période de 4 h écoulée).
- **Gain net** = `(entrée − prix) × quantité − frais d'ouverture − frais de fermeture − report`.
- **Liquidation estimée** : la perte atteint 80 % de la garantie, soit une hausse de `0,8 / levier` (+40 % à ×2, +27 % à ×3, +16 % à ×5). C'est une approximation : Kraken liquide selon le niveau de marge de **tout le compte**.
  En paper, la position est fermée de force (« liquidation simulée ») à ce prix.
- **Garde-fous** : stop loss obligatoire et strictement inférieur à la distance de liquidation ; levier entre 2 et `max_leverage` (3 par défaut, 5 maximum) ; montant maximum par ordre ; objectif ≤ −95 %.

## Live : désactivé par défaut

Le chemin live existe (`kraken.market_order(..., leverage=…)` pour ouvrir, achat avec `reduce_only=true` pour fermer) mais **n'a jamais été exécuté**, pas même en `validate=true` : aucune clé Kraken n'était
disponible pour le tester. Il faut cocher « Autoriser les shorts en LIVE » dans les réglages, et la confirmation serveur (`confirm: true`) reste exigée.

Avant d'activer le live, lance **`python -m server.check_kraken`** : il envoie chaque type d'ordre avec `validate=true` (Kraken contrôle, n'exécute jamais) et affiche ce qui est accepté. Il vérifie :

1. la marge est activée sur ton compte et autorisée dans ton pays ;
2. la paire (USDC / USDT) accepte la marge et le levier voulu (`AssetPairs` : `leverage_sell`) ;
3. un `AddOrder` `sell` avec `leverage=2:1` et un `buy` avec `reduce_only=true` sont acceptés ;
4. les frais d'ouverture et de report réels de ta grille de frais.

En live, le **stop loss d'un short est posé chez Kraken** (ordre `stop-loss` de rachat, `reduce_only`, même levier) : il protège la position même si le programme s'arrête. Il doit être vérifié comme le reste (voir ci-dessous).

## Claude et le short

Les propositions de la page Trading peuvent contenir des shorts, **uniquement si les shorts sont autorisés** dans le mode courant (paper, ou live avec l'option). Le code borne le levier, impose le stop loss et
le garde bien en dessous de la liquidation. Le Bot IA reste **long uniquement**.

## Tutoriel

Une leçon (« Parier sur la baisse : le short ») explique le principe, les risques et les règles de survie. Les exercices du simulateur restent des achats.
