import { createChart, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { LineChart } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { CHART_OPTIONS, indicatorLine } from '@/components/chart/chartTheme'
import { Card } from '@/components/ui/Card'

interface Refs {
  chart: IChartApi
  bot: ISeriesApi<'Line'>
  hold: ISeriesApi<'Line'>
}

/** Courbe d'équité du Bot IA comparée à « acheter et garder » (même capital réparti sur les paires, mêmes frais d'achat). */
export function EquityChart({ runId, equity }: { runId: string; equity: [number, number, number][] }) {
  const el = useRef<HTMLDivElement>(null)
  const refs = useRef<Refs | null>(null)
  const shown = useRef('')

  useEffect(() => {
    if (!el.current) return
    const chart = createChart(el.current, CHART_OPTIONS)
    const hold = chart.addLineSeries({ ...indicatorLine('#7d7a6c', true), lastValueVisible: true })
    const bot = chart.addLineSeries({ color: '#ff7a1a', lineWidth: 2, priceLineVisible: false })
    refs.current = { chart, bot, hold }
    return () => {
      chart.remove()
      refs.current = null
      shown.current = ''
    }
  }, [])

  useEffect(() => {
    const r = refs.current
    if (!r) return
    r.bot.setData(equity.map(([t, v]) => ({ time: t as Time, value: v })))
    r.hold.setData(equity.map(([t, , h]) => ({ time: t as Time, value: h })))
    if (shown.current !== runId) {         // on cadre la courbe à l'ouverture d'un essai, pas à chaque mise à jour
      r.chart.timeScale().fitContent()
      shown.current = runId
    }
  }, [equity, runId])

  return (
    <Card title="Équité" icon={LineChart} actions={<span className="t-mu"><span className="t-ac">━</span> Bot IA · <span>┅</span> acheter et garder</span>}>
      <div ref={el} style={{ height: 280 }} />
    </Card>
  )
}
