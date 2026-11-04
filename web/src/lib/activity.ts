import type { Activity } from './types'

/** Couleur de l'éclair d'un menu : vert si plus de positions en gain qu'en perte, rouge si plus en perte, orange si autant,
 *  gris « inconnu » si le serveur ne fournit pas les gains/pertes (ancienne version du serveur Python : à redémarrer). */
type ZapTone = 'up' | 'down' | 'flat' | 'unknown'

const zapTone = (gain?: number, loss?: number): ZapTone =>
  typeof gain !== 'number' || typeof loss !== 'number' ? 'unknown' : gain > loss ? 'up' : loss > gain ? 'down' : 'flat'

export interface ActivityView {
  /** Positions ouvertes + (trading manuel) ordres limites en attente : l'éclair s'affiche s'il y en a. */
  orders: number
  tone: ZapTone
  /** true / false pour un bot ; null pour le trading manuel (pas d'interrupteur). */
  running: boolean | null
  /** Phrase d'état ajoutée au tooltip du menu. */
  summary: string
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Ce que le menu affiche pour un bot, d'après l'activité renvoyée par le serveur. */
export function readActivity(key: 'bot' | 'ai' | 'manual', a: Activity): ActivityView {
  const { positions, gain, loss } = a[key]
  const tone = zapTone(gain, loss)
  const running = key === 'manual' ? null : a[key].running
  const pending = key === 'manual' ? a.manual.pending : 0
  const held = positions
    ? `${plural(positions, 'position')} ouverte${positions > 1 ? 's' : ''}${tone === 'unknown' ? '' : ` (${gain} en gain, ${loss} en perte)`}`
    : 'aucune position'
  const parts = [running == null ? null : running ? 'bot en marche' : 'bot arrêté', held, pending ? `${plural(pending, 'ordre')} limite en attente` : null]
  const stale = tone === 'unknown'
    ? '\nCouleur de l’éclair indisponible : le serveur Python tourne avec une ancienne version, arrête-le (Ctrl+C) et relance ./run.sh.'
    : ''
  return { orders: positions + pending, tone, running, summary: `État : ${parts.filter(Boolean).join(' · ')}.${stale}` }
}
