import { Bot } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Tip } from '@/components/ui/Tip'
import css from './Header.module.css'

interface HeaderProps {
  title: string
  children: ReactNode
}

/** Bandeau commun : titre à gauche, indicateurs de la page, puis menu (Bot simple / Bot IA) tout à droite. */
export function Header({ title, children }: HeaderProps) {
  return (
    <header className={css.header}>
      <h1 className={css.title}>
        <Bot className="ic" />
        {title}
      </h1>
      <nav className={css.nav}>
        <NavLink to="/" end className={({ isActive }) => (isActive ? css.active : '')}>
          Bot simple
        </NavLink>
        <NavLink to="/ai" className={({ isActive }) => (isActive ? css.active : '')}>
          Bot IA
        </NavLink>
      </nav>
      <div className={css.kpis}>{children}</div>
    </header>
  )
}

interface KpiProps {
  label: string
  tip?: string
  /** Aligne l'infobulle sur le bord droit (indicateurs proches du menu). */
  tipRight?: boolean
  hidden?: boolean
  children: ReactNode
}

export function Kpi({ label, tip, tipRight = true, hidden, children }: KpiProps) {
  if (hidden) return null
  return (
    <div className={css.kpi}>
      <small>
        {label}
        <Tip text={tip} right={tipRight} />
      </small>
      {children}
    </div>
  )
}
