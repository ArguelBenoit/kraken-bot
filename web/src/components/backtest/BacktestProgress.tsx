import { Hourglass } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { BT_LABEL, isActive } from '@/lib/backtest'
import type { BtRun } from '@/lib/types'
import css from './Backtest.module.css'

/** État de l'essai affiché : barre de progression pendant le calcul, motif d'un arrêt anticipé ou d'une erreur. */
export function BacktestProgress({ run }: { run: BtRun }) {
  const { progress: p, status } = run
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
      {!active && (
        <div className="t-mu">
          {run.params.model} · {run.params.pairs.length} paire(s) · {run.params.days} j en bougies de {run.params.timeframe} min · lancé le {run.started}
          {run.seconds != null && ` · ${run.seconds} s`}
        </div>
      )}
      {status === 'stopped' && <div className="warn">Arrêt anticipé : {run.error}. Le résultat ci-dessous porte sur la période déjà rejouée.</div>}
      {status === 'error' && <div className="warn danger">Échec : {run.error}</div>}
      {status === 'cancelled' && <div className="warn">Annulé : le résultat ci-dessous porte sur la période déjà rejouée.</div>}
    </Card>
  )
}
