import { MessagesSquare } from 'lucide-react'
import { ExchangeDetail } from '@/components/exchanges/ExchangeDetail'
import { ExchangeList } from '@/components/exchanges/ExchangeList'
import { Header, Kpi } from '@/components/layout/Header'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePolling } from '@/hooks/usePolling'
import { useExchangesStore } from '@/stores/exchangesStore'

const EX_POLL_MS = 2000

/** Page annexe : ce que la plateforme envoie au modèle (consignes, contexte, outil imposé) et ce qu'il répond, pour le Bot IA et les propositions du Trading. */
export function ExchangesPage() {
  const refresh = useExchangesStore((s) => s.refresh)
  const list = useExchangesStore((s) => s.list)
  const detail = useExchangesStore((s) => s.detail)
  usePolling(refresh, EX_POLL_MS)
  const waiting = !!list?.some((x) => x.status === 'pending')

  return (
    <>
      <Header title="Échanges IA" icon={MessagesSquare}>
        {waiting && <Kpi bare label="Statut"><StatusBadge running runningLabel="EN ATTENTE" /></Kpi>}
        <Kpi label="Échanges" tip="Appels aux modèles gardés depuis le démarrage du serveur (40 maximum)."><b>{list?.length ?? '–'}</b></Kpi>
      </Header>
      <main className="layout">
        <div className="col"><ExchangeList /></div>
        <div className="col">{detail && <ExchangeDetail x={detail} />}</div>
      </main>
    </>
  )
}
