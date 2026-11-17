import { Hourglass } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AGGR_LABEL, BT_LABEL, isActive, marketLabel } from '@/lib/backtest'
import type { BtRun } from '@/lib/types'
import { useBacktestStore } from '@/stores/backtestStore'
import css from './Backtest.module.css'

const EMPTY: never[] = []

/** Réglages de stabilité actifs d'un essai, séparés par des points ; « aucun » si rien n'est réglé. */
function stability(p: BtRun['params']): string {
  const on = [
    p.trend_filter && 'filtre de tendance',
    p.max_same_side != null && `${p.max_same_side} max par sens`,
    p.max_drawdown_pct != null && `disjoncteur ${p.max_drawdown_pct} %${p.drawdown_days == null ? "" : ` sur ${p.drawdown_days} j`}`,
    p.temperature != null && `température ${p.temperature}`,
  ].filter(Boolean)
  return on.length ? on.join(' · ') : 'aucun'
}

/** État de l'essai affiché : barre de progression pendant le calcul, motif d'un arrêt anticipé ou d'une erreur. */
export function BacktestProgress({ run }: { run: BtRun }) {
  const { progress: p, status } = run
  const scenarios = useBacktestStore((s) => s.status?.options.scenarios)
  const active = isActive(status)
  const percent = p.steps ? Math.min(100, (p.step / p.steps) * 100) : 0
  return (
    <Card title={`Essai ${run.id} · ${BT_LABEL[status]}`} icon={Hourglass}>
      {active && (
        <>
          <div className={css.bar}><div className={css.fill} style={{ width: `${percent}%` }} /></div>
          <div className="t-mu">
            {status === 'loading' ? 'Téléchargement des bougies…' : `${status === 'paused' ? 'En pause à l’analyse' : 'Analyse'} ${p.step} / ${p.steps} · date simulée ${p.at || '–'} · ${p.calls} appel(s) au modèle`}
          </div>
        </>
      )}
      <table className={css.stats} style={active ? { marginTop: 8 } : undefined}>
        <tbody>
          {[
            ['Modèle', run.params.model],
            ['Agressivité', AGGR_LABEL[run.params.aggressiveness]],
            ['Trades max · shorts', `${run.params.max_positions} · ${run.params.allow_short ? 'oui' : 'non'}`],
            ['Paires', run.params.pairs.length],
            ['Période', `${run.params.days} j en bougies de ${run.params.timeframe} min`],
            ['Marché', marketLabel(run.params.end, scenarios ?? EMPTY)],
            ['Stabilité', stability(run.params)],
            ['Lancé le', run.started + (run.seconds != null ? ` · ${run.seconds} s` : '')],
          ].map(([label, value]) => <tr key={label}><td className={css.label}>{label}</td><td>{value}</td></tr>)}
        </tbody>
      </table>
      {status === 'stopped' && <div className="warn">Arrêt anticipé : {run.error}. Le résultat ci-dessous porte sur la période déjà rejouée.</div>}
      {status === 'error' && <div className="warn danger">Échec : {run.error}</div>}
      {status === 'cancelled' && <div className="warn">Annulé : le résultat ci-dessous porte sur la période déjà rejouée.</div>}
    </Card>
  )
}
