/** Un échange avec un modèle (journal de la page « Échanges IA »). */
export type ExchangeState = 'pending' | 'ok' | 'error' | 'cancelled'

export interface ExchangeSummary {
  id: string
  /** Qui a posé la question : « Bot IA », « Propositions du Trading ». */
  source: string
  at: string
  provider: string
  model: string
  status: ExchangeState
  usage: { in: number; out: number }
  seconds: number
  error: string
  /** Taille de la demande (consignes + contexte), en caractères. */
  chars: number
}

export interface Exchange extends Omit<ExchangeSummary, 'chars'> {
  /** Consignes générales envoyées au modèle. */
  system: string
  /** Contexte de la demande (marché, positions, réglages…). */
  user: string
  /** Outil imposé : le schéma de la réponse attendue. */
  tool: unknown
  /** Arguments renvoyés par le modèle ; null tant qu'il n'a pas répondu ou en cas d'échec. */
  response: unknown
}
