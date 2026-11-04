import { AiSettingsCard } from '@/components/ai/AiSettingsCard'
import { AiTradesCard } from '@/components/ai/AiTradesCard'
import { DecisionsCard } from '@/components/ai/DecisionsCard'
import { PositionsCard } from '@/components/ai/PositionsCard'
import { Header, Kpi } from '@/components/layout/Header'
import { LogCard } from '@/components/ui/LogCard'
import { ModeSwitch } from '@/components/ui/ModeSwitch'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePolling } from '@/hooks/usePolling'
import { POLL_MS } from '@/lib/constants'
import { fm } from '@/lib/format'
import { AI_KPI_TIPS } from '@/lib/tips'
import { useAiStore } from '@/stores/aiStore'

const Pnl = ({ v }: { v: number | undefined }) => <b className={(v ?? 0) >= 0 ? 't-ok' : 't-ko'}>{fm(v)}</b>

export function AiPage() {
  const refresh = useAiStore((s) => s.refresh)
  const status = useAiStore((s) => s.status)
  const setMode = useAiStore((s) => s.setMode)
  usePolling(refresh, POLL_MS)
  const c = status?.config

  return (
    <>
      <Header title="Kraken Bot IA">
        <Kpi label="Mode" tip={AI_KPI_TIPS['Mode']} tipRight={false}>
          <ModeSwitch mode={c?.mode ?? 'paper'} onChange={(m) => void setMode(m)} />
        </Kpi>
        <Kpi label="Statut" tip={AI_KPI_TIPS['Statut']}>
          <StatusBadge running={!!status?.running} runningLabel={status?.reviewing ? 'ANALYSE…' : 'EN COURS'} />
        </Kpi>
        <Kpi label="PnL réalisé" tip={AI_KPI_TIPS['PnL réalisé']}><Pnl v={status?.pnl} /></Kpi>
        <Kpi label="PnL du jour" tip={AI_KPI_TIPS['PnL du jour']}><Pnl v={status?.day_pnl} /></Kpi>
        <Kpi label="Équité" tip={AI_KPI_TIPS['Équité']}><b>{fm(status?.equity)}</b></Kpi>
        <Kpi label="Positions" tip={AI_KPI_TIPS['Positions']}>
          <b>{status ? `${status.positions.length} / ${c?.max_positions}` : '–'}</b>
        </Kpi>
        <Kpi label="Appels Claude" tip={AI_KPI_TIPS['Appels Claude']}>
          <b>{status ? `${status.usage.calls} / ${c?.max_calls_per_day}` : '–'}</b>
        </Kpi>
      </Header>
      <main className="layout">
        <div className="col">
          <AiSettingsCard />
        </div>
        <div className="col">
          <PositionsCard positions={status?.positions ?? []} />
          <DecisionsCard decisions={status?.decisions ?? []} />
          <AiTradesCard trades={status?.trades ?? []} />
          <LogCard logs={status?.logs ?? []} />
        </div>
      </main>
    </>
  )
}
