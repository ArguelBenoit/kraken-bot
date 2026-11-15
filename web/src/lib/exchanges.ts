import type { ExchangeState } from '@/lib/types'

export const EX_LABEL: Record<ExchangeState, string> = { pending: 'en cours', ok: 'reçu', error: 'erreur', cancelled: 'annulé' }

/** Texte lisible : un JSON est ré-indenté, tout autre texte reste tel quel. */
export function pretty(value: unknown): string {
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
  }
  return value == null ? '' : JSON.stringify(value, null, 2)
}
