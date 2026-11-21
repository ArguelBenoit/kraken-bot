import type { Candle } from '@/lib/types'

/** Courbes EMA superposées aux bougies : période, couleur et libellé. */
export const EMA_LINES = [
  { n: 20, color: '#4da3ff', label: 'EMA 20' },
  { n: 50, color: '#c678ff', label: 'EMA 50' },
] as const

/** EMA de période n des clôtures (amorcée par la moyenne simple des n premières, comme le serveur) ; vide s'il y a moins de n bougies. */
export function emaPoints(candles: Candle[], n: number): { time: number; value: number }[] {
  if (candles.length < n) return []
  const k = 2 / (n + 1)
  let v = candles.slice(0, n).reduce((a, c) => a + c.close, 0) / n
  const out = [{ time: candles[n - 1].time, value: v }]
  for (let i = n; i < candles.length; i++) {
    v = candles[i].close * k + v * (1 - k)
    out.push({ time: candles[i].time, value: v })
  }
  return out
}
