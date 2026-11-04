/** Glossaire : chaque terme technique du tutoriel est expliqué ici, en mots simples. Dans les textes, `[[id]]` ou `[[id|texte affiché]]`
 *  devient un mot cliquable qui ouvre sa définition. */
export interface Term {
  id: string
  term: string
  def: string
}

const GLOSSARY: Term[] = [
  { id: 'crypto', term: 'Cryptomonnaie', def: `Une monnaie numérique (Bitcoin, Ethereum…) qui s'échange sur Internet, jour et nuit. Son prix monte et descend en permanence : c'est ce qui permet de gagner… ou de perdre.` },
  { id: 'stablecoin', term: 'Stablecoin', def: `Une cryptomonnaie conçue pour valoir toujours environ 1 dollar (USDC, USDT). C'est notre « monnaie de base » : on achète une crypto avec des USDC, puis on revient en USDC en revendant.` },
  { id: 'paire', term: 'Paire', def: `Deux monnaies échangées l'une contre l'autre. « BTC/USDC » = le prix d'un Bitcoin exprimé en USDC. Si BTC/USDC vaut 80 000, alors 1 Bitcoin coûte 80 000 USDC.` },
  { id: 'exchange', term: 'Plateforme d’échange', def: `Le site où l'on achète et vend des cryptos. Dans ce projet : Kraken. Dans ce tutoriel, aucune plateforme n'est utilisée : tout est simulé.` },
  { id: 'ordre', term: 'Ordre', def: `Une instruction d'achat ou de vente envoyée à la plateforme.` },
  { id: 'ordre-marche', term: 'Ordre au marché', def: `« Achète (ou vends) tout de suite, au prix actuel. » C'est le plus simple et le plus rapide. C'est celui qu'on utilise dans les exercices.` },
  { id: 'ordre-limite', term: 'Ordre limite', def: `« Achète seulement si le prix descend à tel niveau. » Tu fixes ton prix, mais si le prix n'y arrive jamais, rien ne se passe.` },
  { id: 'long', term: 'Position longue (achat)', def: `Acheter en espérant que le prix monte, pour revendre plus cher. Dans ce tutoriel on ne fait que ça : on ne parie jamais sur la baisse.` },
  { id: 'position', term: 'Position', def: `Ce que tu détiens à un instant donné. « Être en position » = avoir acheté et ne pas encore avoir revendu. « Sans position » = tout est en stablecoin.` },
  { id: 'entree', term: 'Entrée / sortie', def: `L'entrée, c'est le moment (et le prix) où tu achètes. La sortie, c'est le moment où tu revends. Un « trade » = une entrée + une sortie.` },
  { id: 'pnl', term: 'PnL (gain ou perte)', def: `« Profit and Loss » : ce que tu as gagné (+) ou perdu (−), frais compris. Tant que tu n'as pas revendu, c'est un gain « latent » (sur le papier). Une fois vendu, il est « réalisé ».` },
  { id: 'frais', term: 'Frais', def: `Chaque achat et chaque vente coûtent un petit pourcentage à la plateforme (environ 0,26 % ici). Un aller-retour coûte donc ≈ 0,5 % : un gain plus petit que ça est entièrement mangé par les frais.` },
  { id: 'paper', term: 'Paper trading', def: `Trader avec de l'argent fictif, sur de vrais prix (ou de vraies données passées). Tu apprends et tu te trompes sans rien perdre. C'est exactement ce que fait cette page.` },
  { id: 'bougie', term: 'Bougie', def: `Un résumé du prix sur une durée donnée (par exemple 4 heures) : où il a ouvert, où il a fini, son plus haut et son plus bas. Verte = le prix a monté sur la période ; rouge = il a baissé.` },
  { id: 'ouverture', term: 'Ouverture', def: `Le prix au tout début de la bougie.` },
  { id: 'cloture', term: 'Clôture', def: `Le prix à la toute fin de la bougie. C'est le chiffre le plus important : c'est lui que la plupart des méthodes utilisent.` },
  { id: 'meche', term: 'Mèche', def: `Le fin trait au-dessus ou en dessous du corps de la bougie. Il montre jusqu'où le prix est allé (plus haut / plus bas) avant de revenir.` },
  { id: 'timeframe', term: 'Timeframe (durée de bougie)', def: `Ce que représente une bougie : 1 heure, 4 heures, 1 jour… Plus c'est long, moins il y a de bruit et de signaux ; plus c'est court, plus ça bouge vite.` },
  { id: 'tendance-hausse', term: 'Tendance haussière', def: `Le prix monte globalement : les creux sont de plus en plus hauts, les sommets aussi.` },
  { id: 'tendance-baisse', term: 'Tendance baissière', def: `Le prix baisse globalement : les sommets et les creux sont de plus en plus bas.` },
  { id: 'range', term: 'Marché sans direction (range)', def: `Le prix monte et descend dans un même couloir sans aller nulle part. Certaines méthodes y excellent, d'autres s'y font piéger.` },
  { id: 'support', term: 'Support', def: `Un niveau de prix où le prix a déjà rebondi plusieurs fois, comme un plancher.` },
  { id: 'resistance', term: 'Résistance', def: `Un niveau où le prix a déjà plusieurs fois butté vers le haut, comme un plafond.` },
  { id: 'volatilite', term: 'Volatilité', def: `L'ampleur des mouvements du prix. Forte volatilité = ça bouge beaucoup (plus de gains possibles, mais plus de pertes aussi).` },
  { id: 'stop-loss', term: 'Stop loss', def: `Un seuil de perte maximale que tu fixes AVANT d'acheter. Si le prix descend jusque-là (par ex. −3 %), la position est vendue automatiquement. C'est ton filet de sécurité n°1.` },
  { id: 'take-profit', term: 'Take profit (objectif)', def: `Un niveau de gain à partir duquel tu revends automatiquement (par ex. +5 %). Il t'évite de laisser un gain repartir.` },
  { id: 'stop-suiveur', term: 'Stop suiveur', def: `Un stop loss qui « monte » avec le prix : il reste toujours à X % sous le plus haut atteint. Il protège les gains tout en laissant courir la hausse.` },
  { id: 'ratio', term: 'Ratio gain / risque', def: `Combien tu peux gagner par rapport à ce que tu risques. Risquer 2 pour viser 6 = ratio de 3 pour 1. Plus il est élevé, moins tu as besoin d'avoir raison souvent.` },
  { id: 'taille-position', term: 'Taille de position', def: `Le montant que tu engages dans un trade. Règle de prudence : ne jamais risquer plus de 1 à 2 % de ton capital sur un seul trade.` },
  { id: 'signal', term: 'Signal', def: `Le moment précis où une méthode dit « achète » ou « vends », selon ses règles. Sans signal, on ne fait rien.` },
  { id: 'indicateur', term: 'Indicateur', def: `Un calcul fait sur les prix passés et tracé sur le graphique pour aider à décider (RSI, moyennes mobiles…). Il ne prédit rien : il résume ce qui s'est passé.` },
  { id: 'rsi', term: 'RSI', def: `Un indicateur qui note le prix de 0 à 100 selon la force de ses hausses et de ses baisses récentes. Bas = beaucoup de baisse récente ; haut = beaucoup de hausse récente.` },
  { id: 'survente', term: 'Survente', def: `Quand le prix a baissé très vite et très fort (RSI sous 30). L'idée : il a peut-être « trop » baissé et pourrait rebondir.` },
  { id: 'surachat', term: 'Surachat', def: `Quand le prix a monté très vite et très fort (RSI au-dessus de 70). L'idée : il a peut-être « trop » monté et pourrait redescendre.` },
  { id: 'sma', term: 'Moyenne mobile', def: `La moyenne des X derniers prix de clôture, recalculée à chaque bougie. Elle lisse le bruit et montre la direction générale. Plus X est grand, plus elle est lente.` },
  { id: 'ema', term: 'EMA (moyenne mobile exponentielle)', def: `Une moyenne mobile qui donne plus d'importance aux prix récents : elle réagit plus vite qu'une moyenne simple.` },
  { id: 'croisement', term: 'Croisement', def: `Quand deux lignes se traversent sur le graphique. Quand la ligne rapide passe au-dessus de la lente, la hausse prend le dessus ; dans l'autre sens, c'est la baisse.` },
  { id: 'bollinger', term: 'Bandes de Bollinger', def: `Trois lignes autour du prix : une moyenne mobile au milieu, et deux « bandes » au-dessus et en dessous. Elles dessinent la zone où le prix reste la plupart du temps.` },
  { id: 'ecart-type', term: 'Écart-type', def: `Une mesure de l'agitation du prix autour de sa moyenne. Quand le prix s'agite, l'écart-type grandit et les bandes de Bollinger s'écartent.` },
  { id: 'cassure', term: 'Cassure (breakout)', def: `Quand le prix franchit un niveau qu'il n'avait pas dépassé récemment (un nouveau plus haut). On y voit le début possible d'un nouvel élan.` },
  { id: 'donchian', term: 'Canal de Donchian', def: `Un couloir tracé avec le plus haut et le plus bas des X dernières bougies. Sortir du couloir par le haut = cassure.` },
  { id: 'macd', term: 'MACD', def: `Un indicateur à deux lignes qui mesure l'élan du prix : on soustrait une moyenne lente d'une moyenne rapide (la ligne MACD), puis on la compare à sa propre moyenne (le « signal »).` },
  { id: 'momentum', term: 'Momentum (élan)', def: `L'idée que ce qui monte fort a tendance à continuer un moment. On mesure simplement de combien le prix a varié sur les dernières bougies.` },
  { id: 'faux-signal', term: 'Faux signal', def: `Un signal qui n'aboutit à rien : tu achètes, le prix repart dans l'autre sens. Toutes les méthodes en produisent : c'est normal, et c'est pour ça qu'on met un stop loss.` },
  { id: 'filtre', term: 'Filtre de tendance', def: `Une règle supplémentaire pour éviter d'acheter à contre-courant, par exemple « n'achète que si le prix est au-dessus de sa moyenne sur 200 bougies ».` },
  { id: 'fomo', term: 'FOMO', def: `« Fear Of Missing Out » : la peur de rater une hausse, qui pousse à acheter n'importe quand, souvent trop haut. L'ennemi n°1 du débutant.` },
  { id: 'backtest', term: 'Backtest', def: `Tester une méthode sur des prix passés pour voir ce qu'elle aurait donné. Utile, mais le passé ne garantit jamais l'avenir.` },
  { id: 'drawdown', term: 'Drawdown', def: `La plus grosse baisse de ton capital entre un sommet et le creux suivant. Il mesure la douleur qu'une méthode peut infliger avant de se rattraper (si elle se rattrape).` },
]

export const TERMS: Record<string, Term> = Object.fromEntries(GLOSSARY.map((t) => [t.id, t]))
