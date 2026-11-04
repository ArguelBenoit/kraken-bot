/** Propositions de trade de Claude pour la page Trading. */

/** Un preset : un trade à pré-remplir dans le ticket (le montant n'est jamais proposé). */
export interface TradeProposal {
  pair: string
  label: string
  title: string
  type: 'market' | 'limit'
  /** Prix de la paire au moment de la proposition. */
  price: number
  /** Prix limite calculé par le serveur (type limit seulement). */
  limit_price: number | null
  limit_discount_pct: number
  sl_pct: number
  /** 0 = pas d'objectif. */
  tp_pct: number
  /** 0 = pas de stop suiveur. */
  trail_pct: number
  /** Objectif / stop loss ; null sans objectif. */
  ratio: number | null
  /** 0 à 1. */
  confidence: number
  rationale: string
}

export interface ProposalSet {
  trades: TradeProposal[]
  model: string
  market_view: string
  /** Claude ne voit aucun avantage net maintenant. */
  no_edge: boolean
  /** Horodatage (s) de la réponse. */
  at: number
}
