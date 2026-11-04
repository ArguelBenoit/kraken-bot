import {
  createChart, type IChartApi, type IPriceLine, type ISeriesApi, type Time,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { buildMarkers } from '@/lib/markers'
import type { ChartData } from '@/lib/types'
import type { ChartLevel } from '@/lib/chartTypes'
import { CANDLE_STYLE, CHART_OPTIONS, indicatorLine, levelLineOptions } from './chartTheme'

const asTime = (t: number) => t as Time

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
    const price = createChart(priceEl.current, CHART_OPTIONS)
    const rsi = createChart(rsiEl.current, CHART_OPTIONS)
    const candles = price.addCandlestickSeries(CANDLE_STYLE)
    const rsiLine = rsi.addLineSeries({ color: '#ff7a1a', lineWidth: 2 })
    const fast = price.addLineSeries(indicatorLine('#4aa3ff'))
    const slow = price.addLineSeries(indicatorLine('#d58bff'))
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
    // seuils d'achat / de vente du RSI
    const thresholds: ChartLevel[] = [
      { price: data.rsi_buy, color: '#3ddc84', title: '' },
      { price: data.rsi_sell, color: '#ff4d4d', title: '' },
    ]
    c.levels = thresholds.map((l) => c.rsiLine.createPriceLine(levelLineOptions(l)))
  }, [data])

  // lignes horizontales sur le graphique des prix (positions ouvertes, aperçu d'un ordre…)
  const levelsKey = JSON.stringify(levels)
  useEffect(() => {
    const c = chart.current
    if (!c) return
    c.custom.forEach((l) => c.candles.removePriceLine(l))
    c.custom = levels.map((l) => c.candles.createPriceLine(levelLineOptions(l)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelsKey, data])

  return (
    <>
      <div ref={priceEl} id="chart" style={{ height: 440 }} />
      <div ref={rsiEl} style={{ height: 170, marginTop: 4 }} />
    </>
  )
}
