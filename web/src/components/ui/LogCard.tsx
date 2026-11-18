import { ScrollText } from 'lucide-react'
import { Card } from './Card'

/** Journal des derniers événements d'un bot (du plus récent au plus ancien). */
export function LogCard({ id, logs }: { id: string; logs: string[] }) {
  return (
    <Card id={id} title="Journal" icon={ScrollText}>
      <pre className="log">{logs.length ? logs.join('\n') : 'Aucun événement pour le moment.'}</pre>
    </Card>
  )
}
