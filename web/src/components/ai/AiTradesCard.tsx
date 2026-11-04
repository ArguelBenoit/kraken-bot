import { ArrowLeftRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fm, signed } from '@/lib/format'
import type { AiTrade } from '@/lib/types'

export function AiTradesCard({ trades }: { trades: AiTrade[] }) {
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
                <td>{t.side}</td>
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
