import type { ReactNode } from 'react'
import { Tip } from './Tip'

interface Props {
  label: string
  tip?: string
  children: ReactNode
}

/** Libellé + contrôle sur une ligne, avec pastille d'aide optionnelle. */
export function Field({ label, tip, children }: Props) {
  return (
    <label className="field">
      <span>
        {label}
        <Tip text={tip} />
      </span>
      {children}
    </label>
  )
}

/** Plusieurs champs côte à côte. */
export function Fields({ children }: { children: ReactNode }) {
  return <div className="fields">{children}</div>
}
