import { ChartCandlestick, ChartColumn, RefreshCw } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { PriceChart } from '@/components/chart/PriceChart'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { useMaxRowsHeight } from '@/hooks/useMaxRowsHeight'
import { MARKET_TFS, MARKET_VISIBLE_ROWS, pairLabel } from '@/lib/constants'
import { fm, signed } from '@/lib/format'
import { rowSignal, rsiTone, sortScan } from '@/lib/scan'
import { MARKET_TIPS } from '@/lib/tips'
import type { BotConfig, ScanRow } from '@/lib/types'
import { useBotStore } from '@/stores/botStore'
import { useMarketStore } from '@/stores/marketStore'
import css from './MarketCard.module.css'

function SignalCell({ row, cfg }: { row: ScanRow; cfg: BotConfig }) {
  const s = rowSignal(row, cfg)
  const toneCls = { buy: 't-ok', bull: 't-ok', bear: 't-ko', overbought: 't-ko', neutral: 't-mu', info: 't-mu', none: '' }[s.kind]
  return (
    <>
      {s.text && (s.kind === 'buy' || s.kind === 'overbought' ? <b className={toneCls}>{s.text}</b> : <span className={toneCls}>{s.text}</span>)}
      {s.detail && (s.kind === 'info' ? <span className="t-mu">{s.detail}</span> : <span className={toneCls}> ({s.detail})</span>)}
    </>
  )
}

function ScanTable({ cfg }: { cfg: BotConfig }) {
  const rows = useMarketStore((s) => s.rows)
  const selected = useMarketStore((s) => s.chart?.pair)
  const tf = useMarketStore((s) => s.tf)
  const { selectPair } = useMarketStore.getState()
  const tradeThis = useBotStore((s) => s.tradeThis)
  const sorted = useMemo(() => sortScan(rows, cfg), [rows, cfg])
  const wrap = useRef<HTMLDivElement>(null)
  const maxHeight = useMaxRowsHeight(wrap, MARKET_VISIBLE_ROWS, sorted)

  const pick = (pair: string) => {
    selectPair(pair)
    document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div ref={wrap} className={css.wrap} style={{ maxHeight }}>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Paire</th><th>Prix</th><th>24h</th><th className={css.vol}>Volume 24h</th>
            <th>Volatilité<Tip text={MARKET_TIPS['Volatilité']} /></th>
            <th>RSI<Tip text={MARKET_TIPS['RSI']} right /></th>
            <th>Signal</th><th />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={8} className="t-mu">Chargement…</td></tr>
          )}
          {sorted.map((x) =>
            x.error ? (
              <tr key={x.pair}><td>{x.label}</td><td colSpan={7} className="t-mu">indisponible</td></tr>
            ) : (
              <tr key={x.pair} className={selected === x.pair ? css.sel : ''} onClick={() => pick(x.pair)}>
                <td><b>{x.label}</b></td>
                <td>{fm(x.price, (x.price ?? 0) < 1 ? 6 : 2)}</td>
                <td className={(x.chg24 ?? 0) >= 0 ? 't-ok' : 't-ko'}>{signed(x.chg24 ?? 0)}%</td>
                <td className={css.vol}>{fm(x.vol24, 0)}</td>
                <td>{fm(x.volat)}%</td>
                <td className={rsiTone(x, cfg) === 'ok' ? 't-ok' : rsiTone(x, cfg) === 'ko' ? 't-ko' : ''}>{fm(x.rsi, 1)}</td>
                <td><SignalCell row={x} cfg={cfg} /></td>
                <td>
                  <Button variant="sec" size="xs" onClick={(e) => { e.stopPropagation(); tradeThis(x.pair, tf) }}>
                    Trader
                  </Button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Tableau du marché + graphique de la paire sélectionnée. Le sélecteur « Bougie » pilote les deux. */
export function MarketCard() {
  const cfg = useBotStore((s) => s.status?.config)
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
      {cfg && <ScanTable cfg={cfg} />}
      <h2 className={`card-title ${css.chartTitle}`}>
        <span>
          <ChartCandlestick className="ic" />
          Graphique <span>{chartTitle}</span>
        </span>
      </h2>
      <PriceChart data={chart} />
    </Card>
  )
}
