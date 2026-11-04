// Infobulles (générées depuis l'ancienne interface, éditables à la main).
export const FIELD_TIPS: Record<string, string> = {
  "bb_period": "Bollinger : nombre de bougies de la moyenne mobile centrale.",
  "bb_std": "Bollinger : largeur des bandes en écarts-types (2 = classique). Achat quand le cours clôture SOUS la bande basse, vente au retour à la moyenne (ou take profit / stop loss). Plus c'est grand, moins il y a de signaux.",
  "dc_entry": "Cassure : achat quand le cours dépasse le plus haut des N bougies précédentes (méthode « turtles »). Suit les débuts de tendance, beaucoup de faux départs en marché sans direction.",
  "dc_exit": "Cassure : vente quand le cours passe sous le plus bas des N dernières bougies. Plus court que l'entrée, pour sortir vite.",
  "macd_fast": "MACD : EMA rapide (12 par défaut). MACD = EMA rapide − EMA lente.",
  "macd_slow": "MACD : EMA lente (26 par défaut). Doit être supérieure à la rapide.",
  "macd_signal": "MACD : EMA du MACD lui-même (9). Achat quand le MACD croise le signal à la hausse, vente quand il repasse dessous.",
  "mom_period": "Momentum : la hausse est mesurée sur ce nombre de bougies.",
  "mom_min_pct": "Momentum : achat si la hausse sur la période atteint ce %, (et RSI < 80). Vente quand la hausse sur la période redevient négative.",
  "filter_ema": "Filtre de tendance (toutes méthodes) : n'achète que si le cours est AU-DESSUS de l'EMA de cette période. 200 = classique. 0 = pas de filtre. N'est pas appliqué au tableau Marché.",
  "filter_tf": "Bougie utilisée pour le filtre. « idem » = celle de la stratégie ; choisir plus long (ex : 1 jour) = confirmation multi-timeframe.",
  "atr_stop": "Stop dynamique : prix d'entrée − N × ATR(14) (volatilité moyenne des 14 dernières bougies). S'adapte à la volatilité de la crypto et remplace le stop loss en %. 0 = désactivé.",
  "strategy": "RSI = achète les creux, revend les rebonds (retour à la moyenne). Tendance = achète quand la moyenne rapide passe au-dessus de la lente (tendance qui démarre) et sort quand elle repasse dessous : peu de trades, des pertes fréquentes mais petites, de rares gros gains.",
  "ma_fast": "EMA rapide : moyenne mobile exponentielle sur ce nombre de bougies. Réagit vite. Achat quand elle passe au-dessus de l'EMA lente.",
  "ma_slow": "EMA lente : même calcul sur plus de bougies, elle donne la direction de fond. Doit être supérieure à l'EMA rapide. Plus l'écart est grand, moins il y a de trades.",
  "trailing_pct": "Stop suiveur : vente si le prix retombe de ce pourcentage depuis son plus haut atteint pendant la position. Protège les gains en tendance. 0 = désactivé.",
  "preset": "Réglages tout prêts, classés par risque (prudent, modéré, risqué). Ils remplissent le formulaire : clique ensuite sur Enregistrer.",
  "pair": "La crypto tradée contre un stablecoin (USDC/USDT, ≈ 1 $). Le bot n'en gère qu'une à la fois.",
  "mode": "Paper = simulation avec les vrais prix, aucun argent engagé. LIVE = ordres réels sur ton compte Kraken (clés API requises).",
  "timeframe": "Durée d'une bougie en minutes (60 = 1 h, 240 = 4 h). Plus c'est long, moins il y a de trades et de bruit. Les tests ont donné les meilleurs résultats en 240.",
  "order_size": "Montant en stablecoin investi à chaque achat (ex : 100 = 100 USDC). Une seule position à la fois.",
  "rsi_period": "Nombre de bougies utilisées pour calculer le RSI. Court (7) = réactif, plus de trades ; long (14) = plus lisse, moins de signaux.",
  "rsi_buy": "Le bot achète quand le RSI descend à cette valeur ou en dessous (prix « survendu »). Plus bas = achats plus rares mais après de plus fortes baisses.",
  "rsi_sell": "Le bot vend quand le RSI monte à cette valeur ou au-dessus (prix « suracheté »). Doit rester supérieur au seuil d'achat.",
  "take_profit_pct": "Vente automatique quand le gain atteint ce pourcentage depuis l'achat (ex : 4 = +4 %).",
  "stop_loss_pct": "Vente automatique quand la perte atteint ce pourcentage depuis l'achat (ex : 2 = -2 %). Limite les dégâts, mais un stop trop serré sort sur du bruit.",
  "fee_pct": "Frais Kraken estimés par ordre (0,26 % en taker). Un aller-retour achat+vente coûte donc ≈ 0,5 %. Sert au calcul du PnL.",
  "check_every": "Fréquence (en secondes) à laquelle le bot vérifie le marché. Le RSI ne change qu'à la clôture d'une bougie, mais take profit et stop loss sont vérifiés à chaque analyse.",
  "paper_balance": "Capital fictif de départ en mode Paper. Pris en compte au « Reset paper »."
}

export const KPI_TIPS: Record<string, string> = {
  "Mode": "Paper = simulation, aucun argent engagé. LIVE = ordres réels sur ton compte Kraken.",
  "Statut": "EN COURS = le bot surveille le marché et passe les ordres. ARRÊTÉ = rien n'est surveillé, une position ouverte reste telle quelle.",
  "Prix": "Dernier prix de la paire sur Kraken.",
  "RSI": "Valeur actuelle du RSI (0-100) : bas = prix a beaucoup baissé, haut = a beaucoup monté.",
  "Position": "Quantité de crypto détenue et prix d'achat. « aucune » = le bot attend un signal d'achat.",
  "PnL réalisé": "Gains/pertes cumulés des trades déjà vendus, frais inclus.",
  "Équité (paper)": "Valeur totale du portefeuille simulé : stablecoin restant + position au prix actuel."
}

export const AI_KPI_TIPS: Record<string, string> = {
  "Mode": "Paper = simulation, aucun argent engagé. LIVE = ordres réels sur ton compte Kraken (jamais testé).",
  "Statut": "EN COURS = Claude analyse le marché à intervalle régulier et les stops sont surveillés. ARRÊTÉ = rien n'est surveillé, les positions ouvertes restent telles quelles.",
  "PnL réalisé": "Gains/pertes cumulés des trades du bot IA déjà vendus, frais inclus.",
  "PnL du jour": "Gains/pertes réalisés aujourd'hui. Si la perte dépasse le plafond réglé, plus aucune ouverture jusqu'à demain.",
  "Équité": "Cash restant + valeur des positions ouvertes au prix actuel.",
  "Positions": "Positions ouvertes / nombre maximum de trades en parallèle réglé.",
  "Appels Claude": "Analyses faites aujourd'hui / plafond journalier. Chaque appel consomme des tokens facturés."
}

export const MARKET_TIPS: Record<string, string> = {
  "Volatilité": "Amplitude moyenne (plus haut − plus bas) des 30 dernières bougies, en %. Plus c'est élevé, plus ça bouge — donc plus de gains et de pertes possibles. Doit dépasser nettement les frais (≈0,5 % l'aller-retour).",
  "RSI": "RSI de la dernière bougie close. Vert = zone d'achat (≤ seuil d'achat), rouge = zone de vente (≥ seuil de vente)."
}
