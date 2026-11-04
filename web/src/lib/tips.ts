// Infobulles des indicateurs du Bot IA et du tableau Marché.
export const AI_KPI_TIPS: Record<string, string> = {
  "Mode": "Paper = simulation, aucun argent engagé. LIVE = ordres réels sur ton compte Kraken (jamais testé).",
  "PnL réalisé": "Gains/pertes cumulés des trades du bot IA déjà vendus, frais inclus.",
  "PnL du jour": "Gains/pertes réalisés aujourd'hui. Si la perte dépasse le plafond réglé, plus aucune ouverture jusqu'à demain.",
  "Équité": "Cash restant + valeur des positions ouvertes au prix actuel.",
  "Positions": "Positions ouvertes / nombre maximum de trades en parallèle réglé.",
  "Appels Claude": "Analyses faites aujourd'hui / plafond journalier. Chaque appel consomme des tokens facturés."
}

export const MARKET_TIPS: Record<string, string> = {
  "Paire": "La crypto, cotée contre un stablecoin (USDC ou USDT, ≈ 1 $). Clique une ligne pour afficher son graphique ; « Acheter » la met dans le ticket d'ordre.",
  "Prix": "Dernier prix échangé sur Kraken pour cette paire.",
  "24h": "Variation du prix sur les dernières 24 heures. Vert = hausse, rouge = baisse.",
  "Volume 24h": "Montant échangé en stablecoin sur 24 h. Plus il est élevé, plus la paire est liquide : tu achètes et vends plus facilement, avec moins d'écart de prix.",
  "Volatilité": "Amplitude moyenne (plus haut − plus bas) des 30 dernières bougies, en %. Plus c'est élevé, plus ça bouge — donc plus de gains et de pertes possibles. Doit dépasser nettement les frais (≈0,5 % l'aller-retour).",
  "Tendance": "Méthode « tendance » : écart entre l'EMA 20 et l'EMA 50 (moyennes mobiles des 20 et 50 dernières bougies). ↑ vert = l'EMA rapide est au-dessus (tendance haussière), ↓ rouge = en dessous. « croisement » = elle vient de passer au-dessus : le signal d'achat de la méthode.",
  "Bollinger": "Méthode Bollinger : %B = position du prix dans les bandes de Bollinger (20 bougies, 2 écarts-types). 0 = bande basse, 1 = bande haute. Vert (< 0) = prix sous la bande basse : signal d'achat de la méthode (retour à la moyenne attendu). Rouge (> 1) = au-dessus de la bande haute.",
  "RSI": "RSI(14) de la dernière bougie close. Vert = survendu (≤ 30, le prix a beaucoup baissé : rebond possible), rouge = suracheté (≥ 70). Le tableau est trié du plus survendu au plus suracheté."
}
