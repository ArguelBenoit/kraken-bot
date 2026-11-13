import { Pause, Play } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { readActivity } from '@/lib/activity'
import { useActivityStore } from '@/stores/activityStore'
import { progress } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'
import { Kraken } from '@/components/ui/Kraken'
import { Connections } from './Connections'
import { NavIndicators } from './NavIndicators'
import { NAV_GROUPS } from './navigation'
import css from './Sidebar.module.css'

/** Barre latérale : menu par groupes (avec tooltips et pastilles d'activité des bots), puis état des connexions. */
export function Sidebar() {
  const activity = useActivityStore((s) => s.activity)
  const trials = useLearnStore((s) => s.trials)
  const learn = progress(trials)
  const backtesting = activity?.backtest?.running === true
  const btPaused = activity?.backtest?.paused === true
  return (
    <aside className={css.sidebar}>
      <div className={css.brand}>
        <Kraken className={css.logo} />
        Kraken Bot
      </div>
      <nav className={css.nav} aria-label="Menu principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={css.group}>
            <div className={css.label}>{group.label}</div>
            {group.items.map(({ to, label, icon: Icon, tip, activity: key, badge }) => {
              const view = key && activity ? readActivity(key, activity) : null
              const state = badge === 'learn' ? `Avancement : ${learn.done}/${learn.total} épreuves validées.` : badge === 'backtest' && backtesting ? (btPaused ? 'Un backtest est en pause.' : 'Un backtest est en cours.') : null
              return (
                <NavLink
                  key={to} to={to} end={to === '/'} data-tip={view || state ? `${tip}\n\n${view?.summary ?? state}` : tip}
                  aria-label={view || state ? `${label} — ${view?.summary ?? state}` : label}
                  className={({ isActive }) => `${css.link} ${isActive ? css.active : ''}`}
                >
                  <Icon className="ic" />
                  {label}
                  {view && <NavIndicators view={view} />}
                  {badge === 'learn' && <span className={css.count} aria-hidden>{learn.done}/{learn.total}</span>}
                  {badge === 'backtest' && backtesting && (btPaused ? <Pause className={`ic f ${css.paused}`} aria-hidden /> : <Play className={`ic f ${css.running}`} aria-hidden />)}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <Connections />
    </aside>
  )
}
