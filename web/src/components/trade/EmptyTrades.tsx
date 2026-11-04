import { Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/** État vide commun aux pages à positions multiples. */
export function EmptyTrades() {
  return (
    <Card title="Trade en cours" icon={Zap}>
      <span className="t-mu">Aucune position ouverte.</span>
    </Card>
  )
}
