import type { Strategy } from './types'

/** Paires proposées dans les formulaires : [altname Kraken, libellé]. */
export const PAIRS: [string, string][] = [
  ['XBTUSDC', 'BTC/USDC'], ['ETHUSDC', 'ETH/USDC'], ['SOLUSDC', 'SOL/USDC'],
  ['XBTUSDT', 'BTC/USDT'], ['ETHUSDT', 'ETH/USDT'], ['SOLUSDT', 'SOL/USDT'],
  ['XRPUSDC', 'XRP/USDC'], ['SHIBUSDC', 'SHIB/USDC'], ['AVAXUSDC', 'AVAX/USDC'],
  ['LINKUSDC', 'LINK/USDC'], ['ADAUSDC', 'ADA/USDC'], ['DOTUSDC', 'DOT/USDC'],
  ['XDGUSDC', 'DOGE/USDC'], ['TONUSDC', 'TON/USDC'], ['LTCUSDC', 'LTC/USDC'],
]
/** altname Kraken -> libellé (XBTUSDC -> BTC/USDC). */
export const PAIR_LABELS: Record<string, string> = Object.fromEntries(PAIRS)
/** Libellé d'une paire, ou son altname si elle est inconnue. */
export const pairLabel = (p?: string | null) => (p ? (PAIR_LABELS[p] ?? p) : '–')

/** Méthodes du bot simple, avec leur libellé. */
export const STRATEGY_OPTIONS: { value: Strategy; label: string }[] = [
  { value: 'rsi', label: 'RSI' },
  { value: 'trend', label: 'Tendance (EMA)' },
  { value: 'bollinger', label: 'Bollinger' },
  { value: 'donchian', label: 'Cassure (Donchian)' },
  { value: 'macd', label: 'MACD' },
  { value: 'momentum', label: 'Momentum' },
]
/** Méthodes dont le signal vient de `strategies.signal` côté serveur (colonne « sig » du scan). */
export const SIGNAL_STRATEGIES: Strategy[] = ['bollinger', 'donchian', 'macd', 'momentum']

/** Durées de bougie du formulaire du bot simple (minutes). */
export const TIMEFRAMES = [
  { value: 1, label: '1' }, { value: 5, label: '5' }, { value: 15, label: '15' }, { value: 30, label: '30' },
  { value: 60, label: '60' }, { value: 240, label: '240' }, { value: 1440, label: '1440 (1 jour)' },
]
/** Durées possibles du filtre de tendance (0 = celle de la stratégie). */
export const FILTER_TFS = [
  { value: 0, label: 'idem' }, { value: 60, label: '1 h' }, { value: 240, label: '4 h' }, { value: 1440, label: '1 jour' },
]
/** Durées de bougie du tableau Marché et du graphique. */
export const MARKET_TFS = [
  { value: 15, label: '15 min' }, { value: 60, label: '1 h' }, { value: 240, label: '4 h' }, { value: 1440, label: '1 jour' },
]
/** Durées de bougie analysées par le Bot IA. */
export const AI_TFS = MARKET_TFS

/** Fréquence de rafraîchissement du statut d'un bot (ms). */
export const POLL_MS = 3000
/** Fréquence de rafraîchissement du graphique (ms). */
export const CHART_REFRESH_MS = 60_000
/** Lignes visibles du tableau Marché avant défilement. */
export const MARKET_VISIBLE_ROWS = 8
