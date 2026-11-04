import { useMemo, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Tip } from '@/components/ui/Tip'
import { useMaxRowsHeight } from '@/hooks/useMaxRowsHeight'
import { MARKET_VISIBLE_ROWS } from '@/lib/constants'
import { fm, fmPrice, gainClass, signed } from '@/lib/format'
import { bollingerTone, rsiTone, sortScan } from '@/lib/scan'
import { MARKET_TIPS } from '@/lib/tips'
import type { ScanRow } from '@/lib/types'
import { useMarketStore } from '@/stores/marketStore'
import css from './ScanTable.module.css'

/** Cellule « Tendance » : flèche et écart EMA20 / EMA50, « croisement » mis en avant. */
function TrendCell({ row }: { row: ScanRow }) {
  if (row.trend_gap == null) return <td className="t-mu">–</td>
  const up = row.trend_gap > 0
  return (
    <td className={up ? 't-ok' : 't-ko'}>
      {up ? '↑' : '↓'} {signed(row.trend_gap)}%{row.trend_cross && <b> croisement</b>}
    </td>
  )
}

interface Props {
  tradeLabel: string
  onTrade: (pair: string) => void
  onSelect?: (pair: string) => void
}

/** Tableau du marché : une ligne par paire, triée par RSI croissant ; cliquer une ligne affiche son graphique. Les 8 premières lignes sont visibles, le reste défile. */
export function ScanTable({ tradeLabel, onTrade, onSelect }: Props) {
  const rows = useMarketStore((s) => s.rows)
  const selected = useMarketStore((s) => s.chart?.pair)
  const { selectPair } = useMarketStore.getState()
  const sorted = useMemo(() => sortScan(rows), [rows])
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
            <th>Paire<Tip text={MARKET_TIPS['Paire']} /></th><th>Prix<Tip text={MARKET_TIPS['Prix']} /></th>
            <th>24h<Tip text={MARKET_TIPS['24h']} /></th><th>Volume 24h<Tip text={MARKET_TIPS['Volume 24h']} /></th>
            <th>Volatilité<Tip text={MARKET_TIPS['Volatilité']} /></th>
            <th>RSI<Tip text={MARKET_TIPS['RSI']} /></th>
            <th>Tendance<Tip text={MARKET_TIPS['Tendance']} /></th>
            <th>Bollinger<Tip text={MARKET_TIPS['Bollinger']} right /></th>
            <th />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={9} className="t-mu">Chargement…</td></tr>
          )}
          {sorted.map((x) =>
            x.error ? (
              <tr key={x.pair}><td>{x.label}</td><td colSpan={8} className="t-mu">indisponible</td></tr>
            ) : (
              <tr key={x.pair} className={selected === x.pair ? css.sel : ''} onClick={() => pick(x.pair)}>
                <td><b>{x.label}</b></td>
                <td>{fmPrice(x.price)}</td>
                <td className={gainClass(x.chg24 ?? 0)}>{signed(x.chg24 ?? 0)}%</td>
                <td>{fm(x.vol24, 0)}</td>
                <td>{fm(x.volat)}%</td>
                <td className={rsiTone(x) === 'ok' ? 't-ok' : rsiTone(x) === 'ko' ? 't-ko' : ''}>{fm(x.rsi, 1)}</td>
                <TrendCell row={x} />
                <td className={bollingerTone(x) === 'ok' ? 't-ok' : bollingerTone(x) === 'ko' ? 't-ko' : ''}>{fm(x.pctb)}</td>
                <td>
                  <Button variant="sec" size="xs" onClick={(e) => { e.stopPropagation(); onTrade(x.pair) }}>
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
