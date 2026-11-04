import type { ChartLevel, ChartMarker } from '@/lib/chartTypes'
import type { Candle, MethodRun } from './methods'
import type { Position, SimTrade } from './sim'

const GREEN = '#3ddc84'
const RED = '#ff4d4d'
const ACCENT = '#ff7a1a'

/** Signaux de la méthode à afficher : seul le DÉBUT de chaque série de signaux consécutifs est marqué, pour ne pas surcharger le graphique. */
export function signalMarkers(candles: Candle[], run: MethodRun, from: number, to: number): ChartMarker[] {
  const out: ChartMarker[] = []
  for (let i = Math.max(1, from); i <= to; i++) {
    if (run.buy[i] && !run.buy[i - 1]) out.push({ time: candles[i].time, position: 'belowBar', color: GREEN, shape: 'circle' })
    if (run.sell[i] && !run.sell[i - 1]) out.push({ time: candles[i].time, position: 'aboveBar', color: RED, shape: 'circle' })
  }
  return out
}

/** Flèches ACHAT / VENTE posées sur les bougies où l'utilisateur a tradé. */
export function tradeMarkers(trades: SimTrade[]): ChartMarker[] {
  return trades.map((t) => {
    const buy = t.side === 'BUY'
    return { time: t.time, position: buy ? 'belowBar' : 'aboveBar', color: ACCENT, shape: buy ? 'arrowUp' : 'arrowDown', text: buy ? 'ACHAT' : 'VENTE' }
  })
}

/** Lignes du prix d'achat, du stop et de l'objectif de la position ouverte. */
export function positionLevels(position: Position | null): ChartLevel[] {
  if (!position) return []
  return [
    { price: position.entry, color: '#d4d0c0', title: 'ton achat' },
    ...(position.sl ? [{ price: position.sl, color: RED, title: 'stop loss' }] : []),
    ...(position.tp ? [{ price: position.tp, color: GREEN, title: 'objectif' }] : []),
  ]
}
