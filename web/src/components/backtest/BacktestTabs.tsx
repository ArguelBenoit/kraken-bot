import { X } from 'lucide-react'
import { hasStats, isActive } from '@/lib/backtest'
import { gainClass, signed } from '@/lib/format'
import type { BtRun, BtSummary } from '@/lib/types'
import { useBacktestStore } from '@/stores/backtestStore'
import { confirmAction } from '@/stores/uiStore'
import css from './Backtest.module.css'

/** Un onglet par essai : l'essai courant d'abord, puis les essais gardés (15 max) ; titre = id, modèle, gain ; la croix supprime un essai terminé. */
export function BacktestTabs() {
  const current = useBacktestStore((s) => s.status?.current) ?? null
  const history = useBacktestStore((s) => s.status?.history) ?? []      // pas de `?? []` dans le sélecteur : un nouveau tableau à chaque lecture bouclerait
  const viewing = useBacktestStore((s) => s.viewing)
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
  const selected = viewing?.id ?? current?.id

  return (
    <div className={css.tabs}>
      {tabs.map((r) => {
        const live = isActive(r.status)
        return (
          <div key={r.id} className={`${css.tab} ${r.id === selected ? css.on : ''}`}>
            <button type="button" onClick={() => (r.id === current?.id ? closeView() : void open(r.id))}>
              #{r.id} · {r.params.model}
              {hasStats(r.stats) && <> · <b className={gainClass(r.stats.return_pct)}>{signed(r.stats.return_pct)} %</b></>}
            </button>
            {!live && <button type="button" className={css.x} title="Supprimer cet essai" onClick={() => void askRemove(r)}><X className="ic m0" /></button>}
          </div>
        )
      })}
    </div>
  )
}
