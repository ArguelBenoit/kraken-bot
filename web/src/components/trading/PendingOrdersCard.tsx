import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { fm, fmPrice } from '@/lib/format'
import type { ManualPending } from '@/lib/types'
import { useManualStore } from '@/stores/manualStore'

/** Ordres limites en attente (surveillés par ce programme, pas posés chez Kraken). Masqué s'il n'y en a pas. */
export function PendingOrdersCard({ pending }: { pending: ManualPending[] }) {
  const cancel = useManualStore((s) => s.cancelPending)
  if (!pending.length) return null
  return (
    <Card title="Ordres en attente" icon={Clock}>
      <table>
        <thead><tr><th>Paire</th><th>Montant<Tip text="Montant réservé pour cet ordre (en paper, retiré du cash tant que l'ordre est en attente)." /></th><th>Achat si prix ≤<Tip text="L'achat est déclenché quand le prix descend à cette valeur ou en dessous." /></th><th>SL / TP<Tip text="Stop loss et take profit appliqués à la position une fois l'achat exécuté." right /></th><th /></tr></thead>
        <tbody>
          {pending.map((o) => (
            <tr key={o.id}>
              <td><b>{o.label}</b><br /><small className="t-mu">{o.created}</small></td>
              <td>{fm(o.size)}</td>
              <td>{fmPrice(o.limit)}</td>
              <td className="small">{o.sl ? `−${o.sl}%` : '–'} / {o.tp ? `+${o.tp}%` : '–'}</td>
              <td><Button size="xs" variant="ko" onClick={() => void cancel(o.id)}>Annuler</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
