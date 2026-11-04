import type { ChartMarker } from './chartTypes'
import type { Candle, ChartData } from './types'

/** Place chaque trade sur la bougie qui le contient (dernier horodatage de bougie <= trade). */
export function buildMarkers(candles: Candle[], marks: ChartData['marks']): ChartMarker[] {
  const times = candles.map((c) => c.time)
  const snap = (t: number) => {
    let found: number | undefined
    for (const x of times) if (x <= t) found = x
    return found
  }
  const out: ChartMarker[] = []
  for (const m of marks) {
    const time = snap(m.time)
    if (time == null) continue
    const buy = m.side === 'BUY'
    out.push({ time, position: buy ? 'belowBar' : 'aboveBar', color: buy ? '#3ddc84' : '#ff4d4d', shape: buy ? 'arrowUp' : 'arrowDown', text: m.side })
  }
  return out.sort((a, b) => a.time - b.time)
}
