import { Bot, ChartCandlestick, Coins, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import css from './Sidebar.module.css'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Entrées du menu : ajouter une page = une ligne ici + une route dans App.tsx. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Bot simple', icon: ChartCandlestick },
  { to: '/ai', label: 'Bot IA', icon: Bot },
]

export function Sidebar() {
  return (
    <aside className={css.sidebar}>
      <div className={css.brand}>
        <Coins className="ic" />
        Kraken Bot
      </div>
      <nav className={css.nav} aria-label="Menu principal">
        <div className={css.label}>Trading</div>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${css.link} ${isActive ? css.active : ''}`}>
            <Icon className="ic" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className={css.footer}>Kraken · spot</div>
    </aside>
  )
}
