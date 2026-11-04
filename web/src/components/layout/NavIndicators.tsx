import { Play, Square, Zap } from 'lucide-react'
import type { ActivityView } from '@/lib/activity'
import css from './NavIndicators.module.css'

/** Pastilles de bout de ligne : ⚡ = au moins un ordre (vert / rouge / orange selon les gains et pertes) ; ▶ vert = le bot tourne, ■ gris = il est arrêté. */
export function NavIndicators({ view }: { view: ActivityView }) {
  return (
    <span className={css.badges} aria-hidden>
      {view.orders > 0 && <Zap className={`ic f ${css.zap} ${css[view.tone]}`} />}
      {view.running === true && <Play className={`ic f ${css.play}`} />}
      {view.running === false && <Square className={`ic f ${css.stopped}`} />}
    </span>
  )
}
