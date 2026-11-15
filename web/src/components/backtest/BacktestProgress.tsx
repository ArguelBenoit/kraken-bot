import { Hourglass } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { AGGR_LABEL, BT_LABEL, isActive } from '@/lib/backtest'
import type { BtRun } from '@/lib/types'
import css from './Backtest.module.css'

/** Réglages de stabilité actifs d'un essai, en une ligne ; vide si aucun. */
function stability(p: BtRun['params']): string {
  const on = [
    p.trend_filter && 'filtre de tendance',
    p.max_same_side != null && `${p.max_same_side} max par sens`,
    p.max_drawdown_pct != null && `disjoncteur ${p.max_drawdown_pct} %`,
    p.risk_per_trade_pct != null && `risque ${p.risk_per_trade_pct} %/trade`,
    p.stop_vol_mult != null && `stop ≥ ${p.stop_vol_mult}× volatilité`,
    p.temperature != null && `température ${p.temperature}`,
  ].filter(Boolean)
  return on.length ? `Stabilité : ${on.join(' · ')}` : ''
}

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
      <div className="t-mu" style={active ? { marginTop: 6 } : undefined}>
        {run.params.model} · <b>{AGGR_LABEL[run.params.aggressiveness]}</b> · {run.params.max_positions} trades max · shorts {run.params.allow_short ? 'oui' : 'non'}
        <br />{run.params.pairs.length} paire(s) · {run.params.days} j en bougies de {run.params.timeframe} min · {run.params.end ? `fin ${run.params.end} (Binance)` : 'dernières bougies (Kraken)'} · lancé le {run.started}
        {stability(run.params) && <><br />{stability(run.params)}</>}
        {run.seconds != null && ` · ${run.seconds} s`}
      </div>
      {status === 'stopped' && <div className="warn">Arrêt anticipé : {run.error}. Le résultat ci-dessous porte sur la période déjà rejouée.</div>}
      {status === 'error' && <div className="warn danger">Échec : {run.error}</div>}
      {status === 'cancelled' && <div className="warn">Annulé : le résultat ci-dessous porte sur la période déjà rejouée.</div>}
    </Card>
  )
}
