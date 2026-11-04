import { ChartCandlestick, ChartColumn, RefreshCw } from 'lucide-react'
import { PriceChart } from '@/components/chart/PriceChart'
import type { ChartLevel } from '@/lib/chartTypes'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { MARKET_TFS, pairLabel } from '@/lib/constants'
import type { BotConfig } from '@/lib/types'
import { useBotStore } from '@/stores/botStore'
import { useMarketStore } from '@/stores/marketStore'
import css from './MarketCard.module.css'
import { ScanTable } from './ScanTable'

interface MarketCardProps {
  /** Réglages utilisés pour trier et colorer le tableau (par défaut : ceux du bot simple). */
  cfg?: BotConfig
  /** Affiche la colonne « Signal » (propre à la méthode du bot simple). */
  showSignal?: boolean
  tradeLabel?: string
  onTrade?: (pair: string, tf: number) => void
  onSelect?: (pair: string) => void
  levels?: ChartLevel[]
}

/** Tableau du marché + graphique de la paire sélectionnée. Le sélecteur « Bougie » pilote les deux. */
export function MarketCard({ cfg: cfgProp, showSignal = true, tradeLabel = 'Trader', onTrade, onSelect, levels }: MarketCardProps) {
  const botCfg = useBotStore((s) => s.status?.config)
  const tradeThis = useBotStore((s) => s.tradeThis)
  const cfg = cfgProp ?? botCfg
  const tf = useMarketStore((s) => s.tf)
  const info = useMarketStore((s) => s.info)
  const chart = useMarketStore((s) => s.chart)
  const { setTf, loadScan } = useMarketStore.getState()

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

  const chartTitle = chart
    ? `— ${pairLabel(chart.pair)} · ${chart.tf} min · RSI en bas${chart.strategy === 'trend' ? ` · EMA${chart.ma_fast} (bleu) / EMA${chart.ma_slow} (violet)` : ''}`
    : ''

  return (
    <Card title="Marché — où trader ?" icon={ChartColumn} actions={actions}>
      {cfg && <ScanTable cfg={cfg} showSignal={showSignal} tradeLabel={tradeLabel} onTrade={onTrade ?? tradeThis} onSelect={onSelect} />}
      <h2 className={`card-title ${css.chartTitle}`}>
        <span>
          <ChartCandlestick className="ic" />
          Graphique <span>{chartTitle}</span>
        </span>
      </h2>
      <PriceChart data={chart} levels={levels} />
    </Card>
  )
}
