/** Types du trading manuel. */
import type { Providers } from './ai'
import type { Mode } from './market'

export interface ManualConfig {
  mode: Mode
  fee_pct: number
  paper_balance: number
  check_every: number
  max_order: number
  max_leverage: number
  margin_fee_pct: number
  rollover_pct: number
  /** Fournisseur et modèle des propositions de trade. */
  provider: string
  model: string
  allow_live_short: boolean
}

/** Sens d'une position : long = pari sur la hausse, short = pari sur la baisse (vente à découvert en marge). */
export type Side = 'long' | 'short'

export interface ManualPosition {
  id: string
  side: Side
  /** 1 pour un long ; 2 et plus pour un short. */
  leverage: number
  /** Short : prix de liquidation estimé. */
  liq_price: number | null
  /** Short : garantie immobilisée et frais d'ouverture payés. */
  collateral?: number
  open_fees?: number
  /** Frais de report cumulés (short). */
  rollover: number
  /** Montant engagé à l'entrée : quantité × prix d'entrée. */
  notional: number
  /** Live : un stop est posé chez Kraken pour cette position ? null en paper. */
  exchange_stop: boolean | null
  pair: string
  label: string
  qty: number
  entry: number
  cost: number
  peak: number
  price: number
  value: number
  pnl: number
  /** Variation du prix dans le sens qui fait gagner la position (hausse pour un long, baisse pour un short). */
  pnl_pct: number
  sl: number
  tp: number
  trail: number
  sl_price: number | null
  tp_price: number | null
  trail_price: number | null
  opened: string
}

export interface ManualPending {
  id: string
  side: Side
  leverage: number
  pair: string
  label: string
  size: number
  limit: number
  sl: number
  tp: number
  trail: number
  created: string
}

export interface PairTrade {
  time: string
  /** Sens de l'ordre envoyé (BUY / SELL), pas celui de la position. */
  side: 'BUY' | 'SELL'
  /** Trading manuel : sens de la position et ouverture / fermeture. */
  dir?: Side
  kind?: 'open' | 'close'
  pair: string
  price: number
  pnl: number
  why: string
}

export interface ManualStatus {
  config: ManualConfig
  cash: number
  reserved: number
  pnl: number
  unrealized: number
  equity: number
  positions: ManualPosition[]
  pending: ManualPending[]
  trades: PairTrade[]
  logs: string[]
  live_ok: boolean
  /** Les shorts sont-ils autorisés dans le mode courant ? */
  shorts_allowed: boolean
  /** Clé du fournisseur choisi définie côté serveur (propositions de trade). */
  llm_ok: boolean
  /** Une analyse du modèle est en cours (aussi après un rechargement de la page). */
  analyzing: boolean
  providers: Providers
  quote: { pair: string; price: number } | null
}
