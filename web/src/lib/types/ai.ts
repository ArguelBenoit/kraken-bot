/** Types du Bot IA (Claude). */
import type { Mode } from './bot'

export type Aggressiveness = 'prudent' | 'equilibre' | 'agressif'

export interface AiConfig {
  mode: Mode
  model: string
  timeframe: number
  interval_min: number
  check_every: number
  max_positions: number
  aggressiveness: Aggressiveness
  strategies: string[]
  pairs: string[]
  order_size: number
  budget: number
  max_exposure_pct: number
  max_daily_loss_pct: number
  max_calls_per_day: number
  fee_pct: number
  price_in: number
  price_out: number
  credit_base: number
  notes: string
}

export interface AiPosition {
  id: string
  pair: string
  label: string
  strategy: string
  qty: number
  entry: number
  cost: number
  price: number
  pnl_pct: number
  pnl: number
  sl: number
  tp: number
  trail: number
  peak?: number
  conf: number
  reason: string
  opened: string
}

interface AiTrade {
  time: string
  mode: Mode
  side: 'BUY' | 'SELL'
  pair: string
  strategy: string
  price: number
  qty: number
  pnl: number
  why: string
}

export interface AiDecision {
  time: string
  mode: Mode
  view: string
  actions: { ok: boolean; text?: string; reason?: string }[]
}

export interface AiStatus {
  config: AiConfig
  running: boolean
  reviewing: boolean
  next_review_s: number | null
  key_ok: boolean
  live_ok: boolean
  cash: number
  equity: number
  pnl: number
  day_pnl: number
  positions: AiPosition[]
  usage: { day: string; calls: number; in: number; out: number }
  cost: { total: number; today: number; left: number | null; low: boolean }
  trades: AiTrade[]
  decisions: AiDecision[]
  logs: string[]
  options: {
    models: Record<string, string>
    strategies: Record<string, string>
    pairs: { pair: string; label: string }[]
    profiles: Record<Aggressiveness, string>
  }
}
