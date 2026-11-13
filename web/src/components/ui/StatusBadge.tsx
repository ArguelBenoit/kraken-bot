import { Circle, Pause, Square } from 'lucide-react'

interface Props {
  running: boolean
  /** Texte quand le bot tourne (« EN COURS » par défaut). */
  runningLabel?: string
  /** En pause : badge orange fixe « EN PAUSE » (prioritaire sur `running`). */
  paused?: boolean
}

/** Badge de statut d'un bot : vert clignotant quand il tourne, orange en pause, rouge quand il est arrêté. */
export function StatusBadge({ running, runningLabel = 'EN COURS', paused = false }: Props) {
  if (paused) return <span className="badge pause"><Pause className="ic f" />EN PAUSE</span>
  return (
    <span className={`badge ${running ? 'on' : 'off'}`}>
      {running ? <Circle className="ic f" /> : <Square className="ic f" />}
      {running ? runningLabel : 'ARRÊTÉ'}
    </span>
  )
}
