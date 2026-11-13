import { FlaskConical, Info } from 'lucide-react'
import { BacktestForm } from '@/components/backtest/BacktestForm'
import { BacktestTabs } from '@/components/backtest/BacktestTabs'
import { BacktestProgress } from '@/components/backtest/BacktestProgress'
import { BacktestStatsCard } from '@/components/backtest/BacktestStats'
import { EquityChart } from '@/components/backtest/EquityChart'
import { DecisionsCard } from '@/components/ai/DecisionsCard'
import { Header, Kpi } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { PairTradesCard } from '@/components/ui/PairTradesCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { usePolling } from '@/hooks/usePolling'
import { hasStats, isActive } from '@/lib/backtest'
import { fm, gainClass, signed } from '@/lib/format'
import { useBacktestStore } from '@/stores/backtestStore'

const BT_POLL_MS = 2000

/** Page annexe du Bot IA : rejoue le modèle et ses garde-fous sur des bougies passées, sans ordre réel. Accessible depuis la section « Autres » du menu ; un onglet par essai. */
export function BacktestPage() {
  const refresh = useBacktestStore((s) => s.refresh)
  const status = useBacktestStore((s) => s.status)
  const viewing = useBacktestStore((s) => s.viewing)
  usePolling(refresh, BT_POLL_MS)

  const current = status?.current ?? null
  const run = viewing ?? current
  const busy = !!current && isActive(current.status)
  const stats = run && hasStats(run.stats) ? run.stats : null

  return (
    <>
      <Header title="Backtest IA" icon={FlaskConical} more={<>
        <Kpi label="Rendement" tip="Variation de l'équité du Bot IA sur la période rejouée.">
          <b className={stats ? gainClass(stats.return_pct) : ''}>{stats ? `${signed(stats.return_pct)} %` : '–'}</b>
        </Kpi>
        <Kpi label="Acheter-garder" tip="Rendement d'un simple achat conservé, sur les mêmes paires et la même période.">
          <b className={stats ? gainClass(stats.hold_pct) : ''}>{stats ? `${signed(stats.hold_pct)} %` : '–'}</b>
        </Kpi>
        <Kpi label="Trades" tip="Positions clos pendant la période."><b>{stats ? stats.trades : '–'}</b></Kpi>
        <Kpi label="Drawdown" tip="Pire baisse de l'équité depuis un sommet."><b>{stats ? `${fm(stats.max_drawdown_pct)} %` : '–'}</b></Kpi>
      </>}>
        <Kpi bare label="Statut">
          <StatusBadge running={busy} paused={current?.status === 'paused'} />
        </Kpi>
        <Kpi label="Étapes" tip="Analyses du modèle faites sur le total prévu pour l'essai affiché.">
          <b>{run && run.progress.steps ? `${run.progress.step}/${run.progress.steps}` : '–'}</b>
        </Kpi>
      </Header>
      <main className="layout">
        <div className="col">
          <BacktestForm busy={busy} paused={current?.status === 'paused'} />
        </div>
        <div className="col">
          <BacktestTabs />
          {!run && <Card title="Comment ça marche" icon={Info}>Règle les paramètres puis lance un backtest : le modèle choisi rejoue la période, bougie après bougie, avec les vrais garde-fous du Bot IA.</Card>}
          {run && <BacktestProgress run={run} />}
          {stats && <BacktestStatsCard s={stats} />}
          {run && run.equity.length > 0 && <EquityChart runId={run.id} equity={run.equity} />}
          {run && <PairTradesCard trades={[...run.trades].reverse().slice(0, 100)} />}
          {run && <DecisionsCard decisions={[...run.decisions].reverse().slice(0, 40)} />}
        </div>
      </main>
    </>
  )
}
