import { ArrowLeftRight } from 'lucide-react'
import { fmPrice, gainClass, sideClass, signed } from '@/lib/format'
import type { PairTrade } from '@/lib/types'
import { Card } from './Card'

/** Historique des trades d'un bot qui gère plusieurs paires (Bot IA, Trading manuel). */
export function PairTradesCard({ trades }: { trades: PairTrade[] }) {
  return (
    <Card title="Trades" icon={ArrowLeftRight}>
      {trades.length === 0 ? (
        <span className="t-mu">Aucun trade dans ce mode.</span>
      ) : (
        <table>
          <thead><tr><th>Heure</th><th>Paire</th><th /><th>Prix</th><th>PnL</th><th>Raison</th></tr></thead>
          <tbody>
            {trades.map((t, i) => (
              <tr key={`${t.time}-${i}`}>
                <td>{t.time}</td>
                <td>{t.pair}</td>
                <td className={sideClass(t.side)}>{t.side}</td>
                <td>{fmPrice(t.price)}</td>
                <td>{t.side === 'SELL' && <span className={gainClass(t.pnl)}>{signed(t.pnl)}</span>}</td>
                <td className="t-mu">{t.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
