import { ChevronDown, ChevronUp, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

const KEY = 'collapsedCards'

/** Cartes repliées, mémorisées dans le navigateur (préférence d'affichage propre à ce poste). */
function readCollapsed(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function writeCollapsed(id: string, collapsed: boolean) {
  try {
    const rest = readCollapsed().filter((x) => x !== id)
    localStorage.setItem(KEY, JSON.stringify(collapsed ? [...rest, id] : rest))
  } catch { /* stockage indisponible : l'état n'est simplement pas mémorisé */ }
}

interface Props {
  title: string
  icon: LucideIcon
  /** Contenu aligné à droite du titre (boutons, sélecteurs…). */
  actions?: ReactNode
  className?: string
  /** Rend la carte repliable (clic sur le titre) ; l'identifiant sert à mémoriser son état, ouverte par défaut. */
  id?: string
  children: ReactNode
}

/** Carte standard : titre avec icône (et actions à droite) puis contenu ; repliable (flèche à droite du titre) si elle a un `id`. */
export function Card({ title, icon: Icon, actions, className = '', id, children }: Props) {
  const [collapsed, setCollapsed] = useState(() => (id ? readCollapsed().includes(id) : false))
  const toggle = () => { if (id) { setCollapsed(!collapsed); writeCollapsed(id, !collapsed) } }
  const Chevron = collapsed ? ChevronDown : ChevronUp
  return (
    <section className={`card ${className}`}>
      <h2 className="card-title" style={collapsed ? { marginBottom: 0, paddingBottom: 0, borderBottomColor: 'transparent' } : undefined}>
        <span
          onClick={id ? toggle : undefined} style={id ? { cursor: 'pointer', userSelect: 'none' } : undefined}
          role={id ? 'button' : undefined} tabIndex={id ? 0 : undefined} aria-expanded={id ? !collapsed : undefined}
          onKeyDown={id ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } } : undefined}
        >
          <Icon className="ic" />
          {title}
        </span>
        {(actions && !collapsed) || id ? (
          <div className="actions">
            {!collapsed && actions}
            {id && (
              <button type="button" className="card-toggle" onClick={toggle} aria-expanded={!collapsed} title={collapsed ? 'Déplier' : 'Replier'} aria-label={collapsed ? 'Déplier' : 'Replier'}>
                <Chevron className="ic m0" />
              </button>
            )}
          </div>
        ) : null}
      </h2>
      {!collapsed && children}
    </section>
  )
}
