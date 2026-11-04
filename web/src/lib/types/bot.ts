/** Types du bot simple : réglages, état, tableau Marché, graphique. */
export type Mode = 'paper' | 'live'
export type Strategy = 'rsi' | 'trend' | 'bollinger' | 'donchian' | 'macd' | 'momentum'

export interface BotConfig {
  pair: string
  mode: Mode
  strategy: Strategy
  timeframe: number
  rsi_period: number
  rsi_buy: number
  rsi_sell: number
  take_profit_pct: number
  stop_loss_pct: number
  order_size: number
  fee_pct: number
  ma_fast: number
  ma_slow: number
  instant_entry: number
  trailing_pct: number
  check_every: number
  paper_balance: number
  bb_period: number
  bb_std: number
  dc_entry: number
  dc_exit: number
  macd_fast: number
  macd_slow: number
  macd_signal: number
  mom_period: number
  mom_min_pct: number
  filter_ema: number
  filter_tf: number
  atr_stop: number
}

export interface Trade {
  time: string
  mode: Mode
  side: 'BUY' | 'SELL'
  price: number
  qty: number
  pnl: number
  why: string
  ts?: number
  pair?: string
}

export interface BotState {
  cash: number
  qty: number
  entry: number | null
  pair?: string
  cost?: number
  peak?: number
  stop_px?: number | null
  pnl: number
  trades: Trade[]
  equity: number
  pos_price: number | null
  pos_rsi: number | null
  pos_ma: { fast: number; slow: number } | null
}

export interface BotStatus {
  /** ANTHROPIC_API_KEY définie côté serveur (mode IA du bot simple). */
  ai_key?: boolean
  running: boolean
  config: BotConfig
  state: BotState
  logs: string[]
}

interface ScanSignal {
  buy: boolean
  sell: boolean
  info: string
}

export interface ScanRow {
  pair: string
  label: string
  error?: boolean
  price?: number
  chg24?: number
  vol24?: number
  rsi?: number | null
  volat?: number
  trend_gap?: number | null
  trend_cross?: boolean
  sig?: ScanSignal
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}
export interface Point {
  time: number
  value: number
}
export interface ChartData {
  strategy: Strategy
  ma: { fast?: Point[]; slow?: Point[] }
  ma_fast: number
  ma_slow: number
  candles: Candle[]
  rsi: Point[]
  pair: string
  tf: number
  marks: { time: number; side: 'BUY' | 'SELL' }[]
  rsi_buy: number
  rsi_sell: number
}
