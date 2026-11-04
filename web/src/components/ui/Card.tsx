import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  icon: LucideIcon
  /** Contenu aligné à droite du titre (boutons, sélecteurs…). */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, icon: Icon, actions, className = '', children }: Props) {
  return (
    <section className={`card ${className}`}>
      <h2 className="card-title">
        <span>
          <Icon className="ic" />
          {title}
        </span>
        {actions && <div className="actions">{actions}</div>}
      </h2>
      {children}
    </section>
  )
}
