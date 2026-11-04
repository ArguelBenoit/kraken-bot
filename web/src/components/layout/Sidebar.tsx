import { Coins } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { readActivity } from '@/lib/activity'
import { useActivityStore } from '@/stores/activityStore'
import { Connections } from './Connections'
import { NavIndicators } from './NavIndicators'
import { NAV_GROUPS } from './navigation'
import css from './Sidebar.module.css'

/** Barre latérale : menu par groupes (avec tooltips et pastilles d'activité des bots), puis état des connexions. */
export function Sidebar() {
  const activity = useActivityStore((s) => s.activity)
  return (
    <aside className={css.sidebar}>
      <div className={css.brand}>
        <Coins className="ic" />
        Kraken Bot
      </div>
      <nav className={css.nav} aria-label="Menu principal">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={css.group}>
            <div className={css.label}>{group.label}</div>
            {group.items.map(({ to, label, icon: Icon, tip, activity: key }) => {
              const view = key && activity ? readActivity(key, activity) : null
              return (
                <NavLink
                  key={to} to={to} end={to === '/'} data-tip={view ? `${tip}\n\n${view.summary}` : tip}
                  aria-label={view ? `${label} — ${view.summary}` : label}
                  className={({ isActive }) => `${css.link} ${isActive ? css.active : ''}`}
                >
                  <Icon className="ic" />
                  {label}
                  {view && <NavIndicators view={view} />}
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
