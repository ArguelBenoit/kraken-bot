import { Circle, Square } from 'lucide-react'

interface Props {
  running: boolean
  /** Texte quand le bot tourne (« EN COURS » par défaut). */
  runningLabel?: string
}

export function StatusBadge({ running, runningLabel = 'EN COURS' }: Props) {
  return (
    <span className={`badge ${running ? 'on' : 'off'}`}>
      {running ? <Circle className="ic f" /> : <Square className="ic f" />}
      {running ? runningLabel : 'ARRÊTÉ'}
    </span>
  )
}
