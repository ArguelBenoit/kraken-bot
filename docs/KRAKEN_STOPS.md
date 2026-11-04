# Stops chez Kraken (live)

En **paper**, tout est simulé par le programme. En **live**, le Trading pose la protection **chez Kraken** (`server/bots/live.py`), donc elle reste active même si le programme s'arrête.

## Ce qui est posé chez Kraken

Un seul ordre de protection par position (il réserve le volume ; Kraken n'a pas d'OCO sur le spot) :

| Réglage de la position | Ordre Kraken | Détail |
|---|---|---|
| stop loss > 0 | `stop-loss` au prix du stop | filet de sécurité dur (obligatoire pour un short) |
| sinon stop suiveur > 0 | `trailing-stop` avec écart en % | Kraken suit le prix |
| aucun | rien | |

Pour un long l'ordre est une **vente**, pour un short un **rachat** (`reduce_only`, même levier). Le prix et le volume sont formatés avec les décimales de la paire (`AssetPairs`),
et un volume sous `ordermin` est refusé.

## Ce qui reste surveillé par le programme

Objectif (take profit), stop suiveur d'une position qui a aussi un stop loss, ordres limites en attente, et la liquidation simulée (paper). Si le programme s'arrête, ceux-là ne se déclenchent pas.

## Cycle de vie

1. **Ouverture** : ordre au marché, attente de l'exécution (`QueryOrders`) pour lire le **prix et le volume réels**, puis pose du stop.
2. **Chaque contrôle** (`check_every`) : le stop est interrogé. S'il est exécuté, la position est fermée dans l'état avec son prix réel ; s'il a disparu (annulé, expiré), il est reposé ; s'il manque, il est posé.
3. **Modification des stops** ou **vente partielle** : l'ancien stop est annulé et un nouveau est posé (sur la quantité restante).
4. **Fermeture** (objectif, manuelle…) : le stop est annulé, puis l'ordre de fermeture part au marché. Si la fermeture échoue, le stop est reposé.
5. **Échec de pose** : la position reste ouverte, une ligne « ALERTE » est écrite au journal, la carte affiche **STOP NON POSÉ chez Kraken** et la pose est retentée au contrôle suivant.

## Limites

- **Jamais exécuté sur un compte réel**, pas même en `validate=true` (aucune clé disponible) : lance `python -m server.check_kraken` avant le live.
- Frais d'achat supposés en monnaie de cotation (comportement par défaut de Kraken à l'achat) ; le gain affiché reste une estimation.
- Le Bot IA garde ses stops locaux.
- Un stop `trailing-stop` a pour seul réglage l'écart ; sa mise à jour avec un stop loss simultané n'est pas gérée (le stop loss est prioritaire).
