/** Types du trading manuel. */
import type { Mode } from './bot'

export interface ManualConfig {
  mode: Mode
  fee_pct: number
  paper_balance: number
  check_every: number
  max_order: number
}

export interface ManualPosition {
  id: string
  pair: string
  label: string
  qty: number
  entry: number
  cost: number
  peak: number
  price: number
  value: number
  pnl: number
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
  side: 'BUY' | 'SELL'
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
  quote: { pair: string; price: number } | null
}
