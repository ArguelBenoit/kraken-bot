import { useState } from 'react'
import { ChartCandlestick, ChartColumn, RefreshCw } from 'lucide-react'
import { PriceChart } from '@/components/chart/PriceChart'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { EMA_LINES } from '@/lib/ema'
import { MARKET_TFS, pairLabel } from '@/lib/constants'
import type { ChartLevel } from '@/lib/chartTypes'
import { useMarketStore } from '@/stores/marketStore'
import css from './MarketCard.module.css'
import { ScanTable } from './ScanTable'

interface Props {
  /** Texte du bouton d'une ligne du tableau. */
  tradeLabel: string
  onTrade: (pair: string) => void
  onSelect?: (pair: string) => void
  /** Lignes horizontales tracées sur le graphique des prix. */
  levels?: ChartLevel[]
}

const EMA_KEY = 'chartEmas'

/** Périodes d'EMA affichées, mémorisées en local (aucune par défaut). */
function readEmas(): number[] {
  try { return JSON.parse(localStorage.getItem(EMA_KEY) ?? '[]') } catch { return [] }
}

/** Tableau du marché + graphique de la paire sélectionnée. Le sélecteur « Bougie » pilote les deux. */
export function MarketCard({ tradeLabel, onTrade, onSelect, levels }: Props) {
  const tf = useMarketStore((s) => s.tf)
  const info = useMarketStore((s) => s.info)
  const chart = useMarketStore((s) => s.chart)
  const { setTf, loadScan } = useMarketStore.getState()
  const [emas, setEmas] = useState<number[]>(readEmas)
  const toggleEma = (n: number) => {
    const next = emas.includes(n) ? emas.filter((x) => x !== n) : [...emas, n]
    setEmas(next)
    try { localStorage.setItem(EMA_KEY, JSON.stringify(next)) } catch { /* stockage indisponible */ }
  }

  const actions = (
    <>
      <small className={css.info}>{info}</small>
      <span className="t-mu">
        Bougie
        <Tip text="Durée d'une bougie, pour le tableau (RSI, volatilité) ET pour le graphique affiché. Changer la durée met les deux à jour." right />
      </span>
      <select className={css.tf} value={tf} onChange={(e) => setTf(Number(e.target.value))}>
        {MARKET_TFS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <Button variant="sec" size="xs" title="Rafraîchir" onClick={() => void loadScan()}>
        <RefreshCw className="ic m0" />
      </Button>
    </>
  )

  return (
    <Card title="Marché — où trader ?" icon={ChartColumn} actions={actions}>
      <ScanTable tradeLabel={tradeLabel} onTrade={onTrade} onSelect={onSelect} />
      <h2 className={`card-title ${css.chartTitle}`}>
        <span>
          <ChartCandlestick className="ic" />
          Graphique <span>{chart ? `— ${pairLabel(chart.pair)} · ${chart.tf} min · RSI en bas` : ''}</span>
        </span>
      </h2>
      <div className="chips">
        {EMA_LINES.map((e) => (
          <button key={e.n} type="button" className="chip" style={emas.includes(e.n) ? { borderColor: e.color, color: e.color } : undefined}
            onClick={() => toggleEma(e.n)}>{e.label}</button>
        ))}
      </div>
      <PriceChart data={chart} levels={levels} emas={emas} />
    </Card>
  )
}
