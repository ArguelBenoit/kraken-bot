import { History, X } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { AGGR_LABEL, hasStats, isActive, trendLabel } from '@/lib/backtest'
import { gainClass, signed } from '@/lib/format'
import type { BtRun, BtSummary } from '@/lib/types'
import { useBacktestStore } from '@/stores/backtestStore'
import { confirmAction } from '@/stores/uiStore'
import css from './Backtest.module.css'

const EMPTY: never[] = []

/** Un onglet par essai : l'essai courant d'abord, puis les essais gardés (15 max) ; titre = sens du marché, modèle, profil, gain (l'identifiant est dans le panneau de l'essai) ; la croix supprime un essai terminé. */
export function BacktestTabs() {
  const current = useBacktestStore((s) => s.status?.current) ?? null
  const history = useBacktestStore((s) => s.status?.history) ?? []      // pas de `?? []` dans le sélecteur : un nouveau tableau à chaque lecture bouclerait
  const viewing = useBacktestStore((s) => s.viewing)
  const scenarios = useBacktestStore((s) => s.status?.options.scenarios) ?? EMPTY
  const [filter, setFilter] = useState('')                  // sens du marché affiché ; vide = tous
  const { open, closeView, remove } = useBacktestStore.getState()

  const askRemove = async (r: BtRun | BtSummary) => {
    const ok = await confirmAction({
      title: 'Supprimer cet essai ?', danger: true, confirmLabel: 'Supprimer',
      message: `L'essai #${r.id} (${r.params.model}) sera supprimé définitivement.`,
    })
    if (ok) await remove(r.id)
  }

  const tabs: (BtRun | BtSummary)[] = [...(current ? [current] : []), ...history.filter((r) => r.id !== current?.id)]
  if (tabs.length === 0) return null
  const trendOf = (r: BtRun | BtSummary) => trendLabel(r.params.end, scenarios)
  const trends = [...new Set(tabs.map(trendOf))]
  const shown = tabs.filter((r) => !filter || trendOf(r) === filter)
  const selected = viewing?.id ?? current?.id
  const averageOf = (runs: (BtRun | BtSummary)[]) => {      // gain moyen (%) des essais calculés ; null s'il n'y en a aucun
    const returns = runs.flatMap((r) => (hasStats(r.stats) ? [r.stats.return_pct] : []))
    return returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null
  }

  return (
    <Card title="Essais" icon={History}>
      {trends.length > 1 && (
        <div className={css.filters}>
          {['', ...trends].map((t) => {
            const runs = t ? tabs.filter((r) => trendOf(r) === t) : tabs
            const average = averageOf(runs)
            return (
              <button key={t} type="button" className={`chip ${t === filter ? css.chipOn : ''}`} onClick={() => setFilter(t)}>
                {t || 'Tous'} · {runs.length}{average !== null && <> · <b className={gainClass(average)}>{signed(average, 1)} %</b></>}
              </button>
            )
          })}
        </div>
      )}
      <div className={css.tabs}>
        {shown.map((r) => {
          const live = isActive(r.status)
          return (
            <div key={r.id} className={`${css.tab} ${r.id === selected ? css.on : ''}`}>
              <button type="button" onClick={() => (r.id === current?.id ? closeView() : void open(r.id))}>
                {trendLabel(r.params.end, scenarios)} · {r.params.model} · {AGGR_LABEL[r.params.aggressiveness]}
                {hasStats(r.stats) && <> · <b className={gainClass(r.stats.return_pct)}>{signed(r.stats.return_pct)} %</b></>}
              </button>
              {!live && <button type="button" className={css.x} title="Supprimer cet essai" onClick={() => void askRemove(r)}><X className="ic m0" /></button>}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
