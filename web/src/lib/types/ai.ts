/** Types du Bot IA. */
import type { ManualPosition, Side } from './manual'
import type { Mode } from './market'

/** Fournisseurs de modèles proposés par le serveur : libellé, modèles d'exemple, variable de la clé et clé définie ou non. */
export type Providers = Record<string, { label: string; models: string[]; env: string; connected: boolean; local: boolean }>

export type Aggressiveness = 'prudent' | 'equilibre' | 'agressif'

export interface AiConfig {
  mode: Mode
  provider: string
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
  /** null = illimité (champ laissé vide). */
  max_exposure_pct: number | null
  max_daily_loss_pct: number | null
  max_calls_per_day: number | null
  /** Shorts autorisés (paper et live) ; désactivés par défaut. */
  allow_short: boolean
  /** Levier maximum d'un short (2 à 5). */
  max_leverage: number
  min_reward_risk: number | null
  fee_pct: number
  notes: string
}

/** Position du Bot IA : mêmes champs de sens, de stops en prix et de liquidation que le Trading manuel (long ou short), plus la stratégie et la raison du modèle. */
export interface AiPosition extends Omit<ManualPosition, 'value'> {
  strategy: string
  conf: number
  reason: string
}

interface AiTrade {
  time: string
  mode: Mode
  side: 'BUY' | 'SELL'
  /** Sens de la position et nature de l'ordre (absents des anciens trades : long). */
  dir?: Side
  kind?: 'open' | 'close'
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
  /** Crédit ou quota du fournisseur épuisé : le bot a été arrêté. */
  credit_low: boolean
  trades: AiTrade[]
  decisions: AiDecision[]
  logs: string[]
  options: {
    providers: Providers
    strategies: Record<string, string>
    pairs: { pair: string; label: string }[]
    profiles: Record<Aggressiveness, string>
  }
}
