/** Types du marché : mode d'exécution, ligne du tableau Marché, données du graphique. */
export type Mode = 'paper' | 'live'

export interface ScanRow {
  pair: string
  label: string
  error?: boolean
  price?: number
  chg24?: number
  vol24?: number
  rsi?: number | null
  volat?: number
  /** Écart EMA20 / EMA50 en % (> 0 = tendance haussière). */
  trend_gap?: number | null
  /** Croisement haussier EMA20 / EMA50 sur la dernière bougie. */
  trend_cross?: boolean
  /** %B de Bollinger(20, 2) : < 0 sous la bande basse, > 1 au-dessus de la haute. */
  pctb?: number | null
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
  pair: string
  tf: number
  candles: Candle[]
  /** RSI(14), une valeur par bougie (sans les premières, trop tôt pour être calculées). */
  rsi: Point[]
  /** Achats / ventes passés à repérer sur le graphique. */
  marks: { time: number; side: 'BUY' | 'SELL' }[]
}
