import type { Strategy } from './types'

export const PAIRS: [string, string][] = [
  ['XBTUSDC', 'BTC/USDC'], ['ETHUSDC', 'ETH/USDC'], ['SOLUSDC', 'SOL/USDC'],
  ['XBTUSDT', 'BTC/USDT'], ['ETHUSDT', 'ETH/USDT'], ['SOLUSDT', 'SOL/USDT'],
  ['XRPUSDC', 'XRP/USDC'], ['SHIBUSDC', 'SHIB/USDC'], ['AVAXUSDC', 'AVAX/USDC'],
  ['LINKUSDC', 'LINK/USDC'], ['ADAUSDC', 'ADA/USDC'], ['DOTUSDC', 'DOT/USDC'],
  ['XDGUSDC', 'DOGE/USDC'], ['TONUSDC', 'TON/USDC'], ['LTCUSDC', 'LTC/USDC'],
]
export const PAIR_LABELS: Record<string, string> = Object.fromEntries(PAIRS)
export const pairLabel = (p?: string | null) => (p ? (PAIR_LABELS[p] ?? p) : '–')

export const STRATEGY_OPTIONS: { value: Strategy; label: string }[] = [
  { value: 'rsi', label: 'RSI' },
  { value: 'trend', label: 'Tendance (EMA)' },
  { value: 'bollinger', label: 'Bollinger' },
  { value: 'donchian', label: 'Cassure (Donchian)' },
  { value: 'macd', label: 'MACD' },
  { value: 'momentum', label: 'Momentum' },
]
export const STRATEGY_VALUES = STRATEGY_OPTIONS.map((s) => s.value)
/** Méthodes dont le signal vient de `strategies.signal` côté serveur (colonne « sig » du scan). */
export const SIGNAL_STRATEGIES: Strategy[] = ['bollinger', 'donchian', 'macd', 'momentum']

export const TIMEFRAMES = [
  { value: 1, label: '1' }, { value: 5, label: '5' }, { value: 15, label: '15' }, { value: 30, label: '30' },
  { value: 60, label: '60' }, { value: 240, label: '240' }, { value: 1440, label: '1440 (1 jour)' },
]
export const FILTER_TFS = [
  { value: 0, label: 'idem' }, { value: 60, label: '1 h' }, { value: 240, label: '4 h' }, { value: 1440, label: '1 jour' },
]
export const MARKET_TFS = [
  { value: 15, label: '15 min' }, { value: 60, label: '1 h' }, { value: 240, label: '4 h' }, { value: 1440, label: '1 jour' },
]
export const AI_TFS = MARKET_TFS

export const POLL_MS = 3000
export const CHART_REFRESH_MS = 60_000
export const MARKET_VISIBLE_ROWS = 8
