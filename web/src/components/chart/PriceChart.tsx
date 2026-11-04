import {
  createChart, type IChartApi, type IPriceLine, type ISeriesApi, type Time,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { buildMarkers } from '@/lib/markers'
import type { ChartData } from '@/lib/types'

const OPTIONS = {
  layout: { background: { color: '#0b0b0b' }, textColor: '#7d7a6c', fontFamily: 'ui-monospace,DejaVu Sans Mono,monospace' },
  grid: { vertLines: { color: '#161616' }, horzLines: { color: '#161616' } },
  timeScale: { timeVisible: true, borderColor: '#262626' },
  rightPriceScale: { borderColor: '#262626' },
  autoSize: true,
} as const

const asTime = (t: number) => t as Time
const lineOpts = (color: string) => ({ color, lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false })

export interface ChartLevel {
  price: number
  color: string
  title: string
}

interface Series {
  price: IChartApi
  rsi: IChartApi
  candles: ISeriesApi<'Candlestick'>
  rsiLine: ISeriesApi<'Line'>
  fast: ISeriesApi<'Line'>
  slow: ISeriesApi<'Line'>
  levels: IPriceLine[]
  custom: IPriceLine[]
}

/** Graphique des prix (bougies, EMA, trades) + RSI en dessous, échelles de temps synchronisées. */
export function PriceChart({ data, levels = [] }: { data: ChartData | null; levels?: ChartLevel[] }) {
  const priceEl = useRef<HTMLDivElement>(null)
  const rsiEl = useRef<HTMLDivElement>(null)
  const chart = useRef<Series | null>(null)

  useEffect(() => {
    if (!priceEl.current || !rsiEl.current) return
    const price = createChart(priceEl.current, OPTIONS)
    const rsi = createChart(rsiEl.current, OPTIONS)
    const candles = price.addCandlestickSeries({
      upColor: '#3ddc84', downColor: '#ff4d4d', borderVisible: false, wickUpColor: '#3ddc84', wickDownColor: '#ff4d4d',
    })
    const rsiLine = rsi.addLineSeries({ color: '#ff7a1a', lineWidth: 2 })
    const fast = price.addLineSeries(lineOpts('#4aa3ff'))
    const slow = price.addLineSeries(lineOpts('#d58bff'))
    price.timeScale().subscribeVisibleLogicalRangeChange((r) => r && rsi.timeScale().setVisibleLogicalRange(r))
    rsi.timeScale().subscribeVisibleLogicalRangeChange((r) => r && price.timeScale().setVisibleLogicalRange(r))
    chart.current = { price, rsi, candles, rsiLine, fast, slow, levels: [], custom: [] }
    return () => {
      price.remove()
      rsi.remove()
      chart.current = null
    }
  }, [])

  useEffect(() => {
    const c = chart.current
    if (!c || !data) return
    c.candles.setData(data.candles.map((k) => ({ ...k, time: asTime(k.time) })))
    c.rsiLine.setData(data.rsi.map((p) => ({ ...p, time: asTime(p.time) })))
    c.fast.setData((data.ma.fast ?? []).map((p) => ({ ...p, time: asTime(p.time) })))
    c.slow.setData((data.ma.slow ?? []).map((p) => ({ ...p, time: asTime(p.time) })))
    c.candles.setMarkers(buildMarkers(data.candles, data.marks).map((m) => ({ ...m, time: asTime(m.time) })))
    c.levels.forEach((l) => c.rsiLine.removePriceLine(l))
    c.levels = [
      [data.rsi_buy, '#3ddc84'],
      [data.rsi_sell, '#ff4d4d'],
    ].map(([price, color]) => c.rsiLine.createPriceLine({ price: price as number, color: color as string, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: '' }))
  }, [data])

  // lignes horizontales sur le graphique des prix (positions ouvertes, aperçu d'un ordre…)
  const levelsKey = JSON.stringify(levels)
  useEffect(() => {
    const c = chart.current
    if (!c) return
    c.custom.forEach((l) => c.candles.removePriceLine(l))
    c.custom = levels.map((l) => c.candles.createPriceLine({ price: l.price, color: l.color, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: l.title }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsKey, data])

  return (
    <>
      <div ref={priceEl} id="chart" style={{ height: 440 }} />
      <div ref={rsiEl} style={{ height: 170, marginTop: 4 }} />
    </>
  )
}
