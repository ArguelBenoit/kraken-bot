import type { ReactNode } from 'react'
import { Accordion } from './Accordion'
import { Tip } from './Tip'

interface Props {
  /** Identifiant de l'accordéon (état replié mémorisé par page). */
  id: string
  allow: boolean
  onAllow: (on: boolean) => void
  /** Infobulle de la case « Autoriser les shorts ». */
  tip: string
  /** Remarque affichée sous le libellé de la case. */
  note?: string
  /** Champs propres au short (levier, frais), affichés seulement quand les shorts sont autorisés. */
  children: ReactNode
}

/** Bloc repliable des réglages du short : la case « Autoriser les shorts », puis ses champs quand elle est cochée. */
export function ShortsGroup({ id, allow, onAllow, tip, note, children }: Props) {
  return (
    <Accordion id={id} title={<>Shorts{allow && <small> · activés</small>}<Tip text="Vente à découvert en marge, avec levier. Désactivée par défaut : cochée, elle ajoute le levier et les frais propres au short." /></>}>
      <label className="check">
        <input type="checkbox" checked={allow} onChange={(e) => onAllow(e.target.checked)} />
        <span>
          <b>Autoriser les shorts</b>
          <Tip text={tip} />
          {note && <><br /><small>{note}</small></>}
        </span>
      </label>
      {allow && children}
    </Accordion>
  )
}
