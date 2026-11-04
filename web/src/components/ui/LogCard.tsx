import { ScrollText } from 'lucide-react'
import { Card } from './Card'

export function LogCard({ logs }: { logs: string[] }) {
  return (
    <Card title="Journal" icon={ScrollText}>
      <pre className="log">{logs.length ? logs.join('\n') : 'Aucun événement pour le moment.'}</pre>
    </Card>
  )
}
