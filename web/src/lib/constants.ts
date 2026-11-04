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
/** Seuils du RSI repris par le tableau et le graphique : survendu (vert) / suracheté (rouge). */
export const RSI_OVERSOLD = 30
export const RSI_OVERBOUGHT = 70

/** Perte (en part de la garantie) à partir de laquelle un short est liquidé : estimation, comme côté serveur. */
export const LIQ_LOSS = 0.8
