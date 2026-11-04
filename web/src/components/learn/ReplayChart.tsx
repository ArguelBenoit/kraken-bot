import {
  createChart, type IChartApi, type IPriceLine, type ISeriesApi, type SeriesMarker, type Time,
} from 'lightweight-charts'
import { useEffect, useMemo, useRef } from 'react'
import type { Candle, LineSpec, SubSpec } from '@/lib/learn/methods'

const OPTIONS = {
  layout: { background: { color: '#0b0b0b' }, textColor: '#7d7a6c', fontFamily: 'ui-monospace,DejaVu Sans Mono,monospace' },
  grid: { vertLines: { color: '#161616' }, horzLines: { color: '#161616' } },
  timeScale: { timeVisible: true, borderColor: '#262626' },
  rightPriceScale: { borderColor: '#262626' },
  autoSize: true,
} as const

export interface ChartMarker {
  time: number
  position: 'aboveBar' | 'belowBar'
  color: string
  shape: 'arrowUp' | 'arrowDown' | 'circle'
  text?: string
}
export interface PriceLevel {
  price: number
  color: string
  title: string
}

interface Props {
  /** Bougies visibles (le futur n'est jamais passé au graphique). */
  candles: Candle[]
  /** Indicateurs tracés sur les prix ; leurs données couvrent tout l'historique et sont coupées à `candles.length`. */
  lines?: LineSpec[]
  sub?: SubSpec
  markers?: ChartMarker[]
  levels?: PriceLevel[]
  /** Nombre de bougies affichées d'un coup (0 = tout ajuster). */
  window?: number
  onHover?: (index: number | null) => void
  height?: number
}

const pts = (spec: (number | null)[], candles: Candle[]) => {
  const out: { time: Time; value: number }[] = []
  for (let i = 0; i < candles.length; i++) {
    const v = spec[i]
    if (v != null) out.push({ time: candles[i].time as Time, value: v })
  }
  return out
}

/** Graphique de bougies + indicateurs + (option) un second panneau synchronisé (RSI, MACD…). À remonter (`key`) quand la méthode change. */
export function ReplayChart({ candles, lines = [], sub, markers = [], levels = [], window: win = 110, onHover, height = 380 }: Props) {
  const mainEl = useRef<HTMLDivElement>(null)
  const subEl = useRef<HTMLDivElement>(null)
  const refs = useRef<{
    main: IChartApi; sub: IChartApi | null; candles: ISeriesApi<'Candlestick'>
    lines: Map<string, ISeriesApi<'Line'>>; subLines: Map<string, ISeriesApi<'Line'>>; hist: ISeriesApi<'Histogram'> | null
    levels: IPriceLine[]; subLevels: IPriceLine[]
  } | null>(null)
  const hover = useRef(onHover)
  hover.current = onHover
  const timeIndex = useRef(new Map<number, number>())

  useEffect(() => {
    if (!mainEl.current) return
    const main = createChart(mainEl.current, OPTIONS)
    const cs = main.addCandlestickSeries({ upColor: '#3ddc84', downColor: '#ff4d4d', borderVisible: false, wickUpColor: '#3ddc84', wickDownColor: '#ff4d4d' })
    const lineMap = new Map<string, ISeriesApi<'Line'>>()
    for (const l of lines) lineMap.set(l.id, main.addLineSeries({ color: l.color, lineWidth: 1, lineStyle: l.dashed ? 2 : 0, priceLineVisible: false, lastValueVisible: false }))

    let subChart: IChartApi | null = null
    const subLines = new Map<string, ISeriesApi<'Line'>>()
    let hist: ISeriesApi<'Histogram'> | null = null
    const subLevels: IPriceLine[] = []
    if (sub && subEl.current) {
      subChart = createChart(subEl.current, OPTIONS)
      if (sub.histogram) hist = subChart.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false })
      for (const l of sub.lines) subLines.set(l.id, subChart.addLineSeries({ color: l.color, lineWidth: 2, priceLineVisible: false, lastValueVisible: false }))
      const anchor = subLines.values().next().value ?? hist
      if (anchor) for (const lv of sub.levels) subLevels.push(anchor.createPriceLine({ price: lv.value, color: lv.color, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: lv.label }))
      main.timeScale().subscribeVisibleLogicalRangeChange((r) => r && subChart?.timeScale().setVisibleLogicalRange(r))
      subChart.timeScale().subscribeVisibleLogicalRangeChange((r) => r && main.timeScale().setVisibleLogicalRange(r))
    }
    main.subscribeCrosshairMove((p) => hover.current?.(p.time == null ? null : (timeIndex.current.get(p.time as number) ?? null)))
    refs.current = { main, sub: subChart, candles: cs, lines: lineMap, subLines, hist, levels: [], subLevels }
    return () => {
      main.remove()
      subChart?.remove()
      refs.current = null
    }
    // la structure (séries) ne change qu'avec le remontage du composant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const n = candles.length
  const lastTime = n ? candles[n - 1].time : 0
  const markerKey = useMemo(() => JSON.stringify(markers), [markers])
  const levelKey = useMemo(() => JSON.stringify(levels), [levels])

  useEffect(() => {
    const r = refs.current
    if (!r || !n) return
    timeIndex.current = new Map(candles.map((c, i) => [c.time, i]))
    r.candles.setData(candles.map((c) => ({ ...c, time: c.time as Time })))
    for (const l of lines) r.lines.get(l.id)?.setData(pts(l.data, candles))
    if (sub) {
      for (const l of sub.lines) r.subLines.get(l.id)?.setData(pts(l.data, candles))
      if (r.hist && sub.histogram) r.hist.setData(pts(sub.histogram, candles).map((p) => ({ ...p, color: p.value >= 0 ? '#3ddc8499' : '#ff4d4d99' })))
    }
    if (win > 0) r.main.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - 1 - win), to: n - 1 + 6 })
    else r.main.timeScale().fitContent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, lastTime])

  useEffect(() => {
    const r = refs.current
    if (!r) return
    const ms: SeriesMarker<Time>[] = [...markers].sort((a, b) => a.time - b.time).map((m) => ({ ...m, time: m.time as Time }))
    r.candles.setMarkers(ms)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, n])

  useEffect(() => {
    const r = refs.current
    if (!r) return
    r.levels.forEach((l) => r.candles.removePriceLine(l))
    r.levels = levels.map((l) => r.candles.createPriceLine({ price: l.price, color: l.color, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: l.title }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey])

  return (
    <div>
      <div ref={mainEl} style={{ height }} />
      {sub && (
        <>
          <div className="small t-mu" style={{ margin: '6px 0 2px' }}>{sub.title}</div>
          <div ref={subEl} style={{ height: 150 }} />
        </>
      )}
    </div>
  )
}
