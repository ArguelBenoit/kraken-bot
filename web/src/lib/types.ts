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

export interface ScanSignal {
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

// ---------- Bot IA ----------
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

export interface AiTrade {
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

// ---------- Trading manuel ----------
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

// ---------- Activité (menu) ----------
export interface Activity {
  /** gain / loss : nombre de positions ouvertes en gain / en perte au prix actuel. */
  bot: { running: boolean; positions: number; gain: number; loss: number }
  ai: { running: boolean; positions: number; gain: number; loss: number }
  manual: { positions: number; pending: number; gain: number; loss: number }
}

// ---------- Connexions (variables d'environnement, jamais leurs valeurs) ----------
export interface EnvVar {
  name: string
  set: boolean
}
export interface Connections {
  claude: EnvVar[]
  kraken: EnvVar[]
}

// ---------- Mode IA du bot simple ----------
export interface Suggestion {
  rationale: string
  market_view: string
  /** 0 à 1 ; null si Claude ne l'a pas donnée. */
  confidence: number | null
  /** Claude ne voit aucun avantage net maintenant : mieux vaut ne pas trader. */
  no_edge: boolean
  has_position: boolean
  model: string
  config: Partial<BotConfig>
}
