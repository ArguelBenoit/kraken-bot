import type { LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Tip } from '@/components/ui/Tip'
import css from './Header.module.css'

interface HeaderProps {
  title: string
  icon: LucideIcon
  /** Indicateurs essentiels, en première ligne. */
  children: ReactNode
  /** Indicateurs secondaires, en seconde ligne. */
  more?: ReactNode
}

/** Bandeau de page : titre à gauche, indicateurs alignés à droite : l'essentiel en première ligne, le reste (`more`) en seconde (la navigation est dans la barre latérale). */
export function Header({ title, icon: Icon, children, more }: HeaderProps) {
  const ref = useRef<HTMLElement>(null)

  // le bandeau est collant : on publie sa hauteur réelle (qui varie si les indicateurs passent à la ligne) pour les autres éléments collants
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const publish = () => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header ref={ref} className={css.header}>
      <div className={css.inner}>
        <h1 className={css.title}>
          <Icon className="ic" />
          {title}
        </h1>
        <div className={css.right}>
          <div className={css.kpis}>{children}</div>
          {more && <div className={css.kpis}>{more}</div>}
        </div>
      </div>
    </header>
  )
}

interface KpiProps {
  label: string
  tip?: string
  /** Aligne l'infobulle sur le bord droit (indicateurs près du bord de l'écran). */
  tipRight?: boolean
  hidden?: boolean
  /** Sans libellé : seulement la valeur (ou le contrôle) suivie de sa pastille d'aide. */
  bare?: boolean
  children: ReactNode
}

/** Un indicateur du bandeau : libellé + infobulle + valeur, ou (`bare`) seulement la valeur et son aide. */
export function Kpi({ label, tip, tipRight = true, hidden, bare, children }: KpiProps) {
  if (hidden) return null
  if (bare)
    return (
      <div className={css.kpi} role="group" aria-label={label}>
        {children}
        <Tip text={tip} right={tipRight} />
      </div>
    )
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
