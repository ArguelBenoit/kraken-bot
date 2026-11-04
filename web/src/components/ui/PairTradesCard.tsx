import { ArrowLeftRight } from 'lucide-react'
import { fmPrice, gainClass, signed } from '@/lib/format'
import type { PairTrade } from '@/lib/types'
import { Card } from './Card'

/** Libellé et couleur d'une ligne : ACHAT / VENTE pour un long, SHORT / RACHAT pour un short (le Bot IA n'a que des longs). */
function describe(t: PairTrade): { label: string; tone: 't-ok' | 't-ko'; closing: boolean } {
  const closing = t.kind ? t.kind === 'close' : t.side === 'SELL'
  if (t.dir === 'short') return closing ? { label: 'RACHAT', tone: 't-ok', closing } : { label: 'SHORT', tone: 't-ko', closing }
  return t.side === 'BUY' ? { label: 'ACHAT', tone: 't-ok', closing } : { label: 'VENTE', tone: 't-ko', closing }
}

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
            {trades.map((t, i) => {
              const d = describe(t)
              return (
              <tr key={`${t.time}-${i}`}>
                <td>{t.time}</td>
                <td>{t.pair}</td>
                <td className={d.tone}>{d.label}</td>
                <td>{fmPrice(t.price)}</td>
                <td>{d.closing && <span className={gainClass(t.pnl)}>{signed(t.pnl)}</span>}</td>
                <td className="t-mu">{t.why}</td>
              </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}
