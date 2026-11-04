import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Tip } from '@/components/ui/Tip'
import css from './Header.module.css'

interface HeaderProps {
  title: string
  icon: LucideIcon
  children: ReactNode
}

/** Bandeau de page : titre à gauche, indicateurs alignés à droite (la navigation est dans la barre latérale). */
export function Header({ title, icon: Icon, children }: HeaderProps) {
  return (
    <header className={css.header}>
      <h1 className={css.title}>
        <Icon className="ic" />
        {title}
      </h1>
      <div className={css.kpis}>{children}</div>
    </header>
  )
}

interface KpiProps {
  label: string
  tip?: string
  /** Aligne l'infobulle sur le bord droit (indicateurs près du bord de l'écran). */
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
