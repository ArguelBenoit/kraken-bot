import { useState, type ReactNode } from 'react'

const KEY = 'accordions'

/** États ouvert/fermé mémorisés dans le navigateur (préférence d'affichage, propre à ce poste) ; fermé par défaut. */
function readOpen(id: string): boolean {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}')[id] === true } catch { return false }
}

function writeOpen(id: string, open: boolean) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    localStorage.setItem(KEY, JSON.stringify({ ...all, [id]: open }))
  } catch { /* stockage indisponible : l'état n'est simplement pas mémorisé */ }
}

/** Groupe repliable, fermé par défaut ; `id` identifie le groupe pour mémoriser son état d'une visite à l'autre. */
export function Accordion({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(() => readOpen(id))
  return (
    <details className="group" open={open} onToggle={(e) => { const o = e.currentTarget.open; setOpen(o); writeOpen(id, o) }}>
      <summary>{title}</summary>
      {children}
    </details>
  )
}
