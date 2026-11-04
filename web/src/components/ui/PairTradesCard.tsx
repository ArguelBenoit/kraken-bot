import { ArrowLeftRight } from 'lucide-react'
import { fm, signed } from '@/lib/format'
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
                <td className={t.side === 'BUY' ? 't-ok' : 't-ko'}>{t.side}</td>
                <td>{fm(t.price, t.price < 1 ? 6 : 2)}</td>
                <td>{t.side === 'SELL' && <span className={t.pnl >= 0 ? 't-ok' : 't-ko'}>{signed(t.pnl)}</span>}</td>
                <td className="t-mu">{t.why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}
