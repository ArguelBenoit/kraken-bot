import type { Candle, ChartData } from './types'

export interface Marker {
  time: number
  position: 'belowBar' | 'aboveBar'
  color: string
  shape: 'arrowUp' | 'arrowDown'
  text: string
}

/** Place chaque trade sur la bougie qui le contient (dernier horodatage de bougie <= trade). */
export function buildMarkers(candles: Candle[], marks: ChartData['marks']): Marker[] {
  const times = candles.map((c) => c.time)
  const snap = (t: number) => {
    let found: number | undefined
    for (const x of times) if (x <= t) found = x
    return found
  }
  const out: Marker[] = []
  for (const m of marks) {
    const time = snap(m.time)
    if (time == null) continue
    const buy = m.side === 'BUY'
    out.push({ time, position: buy ? 'belowBar' : 'aboveBar', color: buy ? '#3ddc84' : '#ff4d4d', shape: buy ? 'arrowUp' : 'arrowDown', text: m.side })
  }
  return out.sort((a, b) => a.time - b.time)
}
