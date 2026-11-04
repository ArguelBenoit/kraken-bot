import { useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Tip } from '@/components/ui/Tip'
import { useMaxRowsHeight } from '@/hooks/useMaxRowsHeight'
import { MARKET_VISIBLE_ROWS } from '@/lib/constants'
import { fm, fmPrice, gainClass, signed } from '@/lib/format'
import { rowSignal, rsiTone, sortScan } from '@/lib/scan'
import { MARKET_TIPS } from '@/lib/tips'
import type { BotConfig, ScanRow } from '@/lib/types'
import { useMarketStore } from '@/stores/marketStore'
import css from './ScanTable.module.css'

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

interface Props {
  cfg: BotConfig
  showSignal: boolean
  tradeLabel: string
  onTrade: (pair: string, tf: number) => void
  onSelect?: (pair: string) => void
}

/** Tableau du marché : une ligne par paire, triée selon la méthode ; cliquer une ligne affiche son graphique. Les 8 premières lignes sont visibles, le reste défile. */
export function ScanTable({ cfg, showSignal, tradeLabel, onTrade, onSelect }: Props) {
  const rows = useMarketStore((s) => s.rows)
  const selected = useMarketStore((s) => s.chart?.pair)
  const tf = useMarketStore((s) => s.tf)
  const { selectPair } = useMarketStore.getState()
  const sorted = useMemo(() => sortScan(rows, cfg), [rows, cfg])
  const wrap = useRef<HTMLDivElement>(null)
  const maxHeight = useMaxRowsHeight(wrap, MARKET_VISIBLE_ROWS, sorted)

  const pick = (pair: string) => {
    selectPair(pair)
    onSelect?.(pair)
    document.getElementById('chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div ref={wrap} className={css.wrap} style={{ maxHeight }}>
      <table className={css.table}>
        <thead>
          <tr>
            <th>Paire</th><th>Prix</th><th>24h</th><th>Volume 24h</th>
            <th>Volatilité<Tip text={MARKET_TIPS['Volatilité']} /></th>
            <th>RSI<Tip text={MARKET_TIPS['RSI']} right /></th>
            {showSignal && <th>Signal</th>}<th />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={showSignal ? 8 : 7} className="t-mu">Chargement…</td></tr>
          )}
          {sorted.map((x) =>
            x.error ? (
              <tr key={x.pair}><td>{x.label}</td><td colSpan={showSignal ? 7 : 6} className="t-mu">indisponible</td></tr>
            ) : (
              <tr key={x.pair} className={selected === x.pair ? css.sel : ''} onClick={() => pick(x.pair)}>
                <td><b>{x.label}</b></td>
                <td>{fmPrice(x.price)}</td>
                <td className={gainClass(x.chg24 ?? 0)}>{signed(x.chg24 ?? 0)}%</td>
                <td>{fm(x.vol24, 0)}</td>
                <td>{fm(x.volat)}%</td>
                <td className={rsiTone(x, cfg) === 'ok' ? 't-ok' : rsiTone(x, cfg) === 'ko' ? 't-ko' : ''}>{fm(x.rsi, 1)}</td>
                {showSignal && <td><SignalCell row={x} cfg={cfg} /></td>}
                <td>
                  <Button variant="sec" size="xs" onClick={(e) => { e.stopPropagation(); onTrade(x.pair, tf) }}>
                    {tradeLabel}
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
