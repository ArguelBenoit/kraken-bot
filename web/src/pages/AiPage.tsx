import { Bot } from 'lucide-react'
import { AiActiveConfig } from '@/components/ai/AiActiveConfig'
import { AiControls } from '@/components/ai/AiControls'
import { AiSettingsCard } from '@/components/ai/AiSettingsCard'
import { DecisionsCard } from '@/components/ai/DecisionsCard'
import { AiOpenTrades } from '@/components/ai/AiOpenTrades'
import { Header, Kpi } from '@/components/layout/Header'
import { RegimeKpi } from '@/components/layout/RegimeKpi'
import { LogCard } from '@/components/ui/LogCard'
import { PairTradesCard } from '@/components/ui/PairTradesCard'
import { ModeSwitch } from '@/components/ui/ModeSwitch'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePolling } from '@/hooks/usePolling'
import { POLL_MS } from '@/lib/constants'
import { fm, gainClass, signed } from '@/lib/format'
import { AI_KPI_TIPS } from '@/lib/tips'
import { useAiStore } from '@/stores/aiStore'

const Pnl = ({ v }: { v: number | undefined }) => <b className={gainClass(v ?? 0)}>{fm(v)}</b>

/** Page du Bot IA : Le modèle analyse le marché et gère jusqu'à 10 positions en parallèle. */
export function AiPage() {
  const refresh = useAiStore((s) => s.refresh)
  const status = useAiStore((s) => s.status)
  const setMode = useAiStore((s) => s.setMode)
  usePolling(refresh, POLL_MS)
  const c = status?.config
  const gainPct = status && c?.budget ? ((status.equity - c.budget) / c.budget) * 100 : null

  return (
    <>
      <Header title="Bot IA" icon={Bot} more={<>
        <Kpi label="PnL réalisé" tip={AI_KPI_TIPS['PnL réalisé']}><Pnl v={status?.pnl} /></Kpi>
        <Kpi label="PnL du jour" tip={AI_KPI_TIPS['PnL du jour']}><Pnl v={status?.day_pnl} /></Kpi>
        <Kpi label="Gain total" tip={AI_KPI_TIPS['Gain total']}>{gainPct !== null ? <b className={gainClass(gainPct)}>{signed(gainPct)} %</b> : <b>–</b>}</Kpi>
        <Kpi label="Équité" tip={AI_KPI_TIPS['Équité']}><b>{fm(status?.equity)}</b></Kpi>
        <Kpi label="Appels IA" tip={AI_KPI_TIPS['Appels IA']}>
          <b>{status ? `${status.usage.calls} / ${c?.max_calls_per_day ?? '∞'}` : '–'}</b>
        </Kpi>
      </>}>
        <Kpi bare label="Mode" tip={AI_KPI_TIPS['Mode']} tipRight={false}>
          <ModeSwitch mode={c?.mode ?? 'paper'} onChange={(m) => void setMode(m)} />
        </Kpi>
        <Kpi bare label="Statut">
          <StatusBadge running={!!status?.running} runningLabel={status?.reviewing ? 'ANALYSE…' : 'EN COURS'} />
        </Kpi>
        <RegimeKpi />
        <Kpi label="Positions" tip={AI_KPI_TIPS['Positions']}>
          <b>{status ? `${status.positions.length} / ${c?.max_positions}` : '–'}</b>
        </Kpi>
      </Header>
      <main className="layout">
        <div className="col">
          {status && <AiControls status={status} />}
          {status && <AiActiveConfig status={status} />}
          <AiSettingsCard />
        </div>
        <div className="col">
          <AiOpenTrades positions={status?.positions ?? []} feePct={c?.fee_pct ?? 0.26} shortFeePct={c?.short_fee_pct ?? 0.26} />
          <PairTradesCard id="ai-trades" trades={status?.trades ?? []} />
          <DecisionsCard id="ai-decisions" decisions={status?.decisions ?? []} exchangeUrl={(d) => (d.exchange ? `/api/exchanges/${d.exchange}` : null)} />
          <LogCard id="ai-log" logs={status?.logs ?? []} />
        </div>
      </main>
    </>
  )
}
