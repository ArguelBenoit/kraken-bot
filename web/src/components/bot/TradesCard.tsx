import { ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fm, sideClass } from '@/lib/format'
import type { Trade } from '@/lib/types'

/** Historique des trades du bot simple dans le mode courant. */
export function TradesCard({ trades }: { trades: Trade[] }) {
  return (
    <Card title="Trades" icon={ArrowLeftRight}>
      {trades.length === 0 ? (
        <div className="t-mu">Aucun trade pour le moment.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Heure</th><th>Type</th><th>Prix</th><th>Qté</th><th>Valeur</th><th>PnL</th><th>Raison</th></tr>
            </thead>
            <tbody>
              {trades.map((t, i) => (
                <tr key={`${t.ts ?? t.time}-${i}`}>
                  <td>{t.time}</td>
                  <td className={sideClass(t.side)}>{t.side}</td>
                  <td>{fm(t.price)}</td>
                  <td>{fm(t.qty, 6)}</td>
                  <td>{fm(t.qty * t.price)}</td>
                  <td>{t.side === 'SELL' ? fm(t.pnl) : ''}</td>
                  <td>{t.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
