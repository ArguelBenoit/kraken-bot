/** Types du backtest du Bot IA (réponses de /api/backtest). */
import type { AiDecision, Aggressiveness, Providers } from './ai'
import type { PairTrade } from './manual'

/** Réglages d'un essai (ceux de la page, plus ceux repris du Bot IA). */
export interface BtParams {
  provider: string
  model: string
  pairs: string[]
  timeframe: number
  days: number
  interval_min: number
  aggressiveness: Aggressiveness
  allow_short: boolean
  min_reward_risk: number | null
  max_leverage: number
  max_positions: number
  budget: number
  order_size: number
  max_exposure_pct: number | null
  max_daily_loss_pct: number | null
  fee_pct: number
  strategies: string[]
  max_calls: number | null
}

/** Résumé chiffré d'un essai ; vide tant qu'aucune bougie n'a été rejouée. */
export interface BtStats {
  return_pct: number
  hold_pct: number
  pnl: number
  trades: number
  wins: number
  win_rate: number | null
  avg_win: number
  avg_loss: number
  payoff: number | null
  expectancy: number | null
  profit_factor: number | null
  max_drawdown_pct: number
  fees: number
  calls: number
  tokens_in: number
  tokens_out: number
  errors: number
  refused: number
}

/** loading = bougies en téléchargement ; paused = en pause entre deux bougies ; stopped = arrêt voulu du moteur (plafond d'appels, erreurs répétées) : le résultat partiel est gardé. */
export type BtState = 'loading' | 'running' | 'paused' | 'done' | 'cancelled' | 'stopped' | 'error'

export interface BtTrade extends PairTrade {
  strategy: string
  qty: number
  held_h: number
}

export interface BtRun {
  id: string
  started: string
  status: BtState
  error: string
  seconds?: number
  params: BtParams
  progress: { step: number; steps: number; calls: number; at: string }
  usage: { in: number; out: number }
  fees: number
  errors: number
  refused: number
  /** [instant (s), équité du Bot IA, équité d'acheter-garder]. */
  equity: [number, number, number][]
  trades: BtTrade[]
  decisions: AiDecision[]
  stats: BtStats | Record<string, never>
}

export interface BtSummary {
  id: string
  started: string
  status: BtState
  params: BtParams
  stats: BtStats | Record<string, never>
}

export interface BtStatus {
  current: BtRun | null
  history: BtSummary[]
  options: {
    providers: Providers
    pairs: { pair: string; label: string }[]
    /** Réglages enregistrés du Bot IA : valeurs de départ du formulaire. */
    defaults: Omit<BtParams, 'days' | 'max_calls'> & { notes: string }
    /** Stratégies que le modèle peut utiliser, avec leur description. */
    strategies: Record<string, string>
    /** Durée maximale testable (jours) selon la bougie en minutes. */
    max_days: Record<string, number>
  }
}
