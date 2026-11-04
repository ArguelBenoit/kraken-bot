import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fm } from '@/lib/format'
import type { ManualPending } from '@/lib/types'
import { useManualStore } from '@/stores/manualStore'

const dp = (p: number) => (p < 1 ? 6 : 2)

/** Ordres limites en attente (surveillés par ce programme, pas posés chez Kraken). Masqué s'il n'y en a pas. */
export function PendingOrdersCard({ pending }: { pending: ManualPending[] }) {
  const cancel = useManualStore((s) => s.cancelPending)
  if (!pending.length) return null
  return (
    <Card title="Ordres en attente" icon={Clock}>
      <table>
        <thead><tr><th>Paire</th><th>Montant</th><th>Achat si prix ≤</th><th>SL / TP</th><th /></tr></thead>
        <tbody>
          {pending.map((o) => (
            <tr key={o.id}>
              <td><b>{o.label}</b><br /><small className="t-mu">{o.created}</small></td>
              <td>{fm(o.size)}</td>
              <td>{fm(o.limit, dp(o.limit))}</td>
              <td className="small">{o.sl ? `−${o.sl}%` : '–'} / {o.tp ? `+${o.tp}%` : '–'}</td>
              <td><Button size="xs" variant="ko" onClick={() => void cancel(o.id)}>Annuler</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
