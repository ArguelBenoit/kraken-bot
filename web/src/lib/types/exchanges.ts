/** Un échange avec un modèle : ce qui lui a été envoyé et ce qu'il a répondu (ouvert depuis une décision du Bot IA ou d'un backtest). */
export type ExchangeState = 'pending' | 'ok' | 'error' | 'cancelled'

export interface Exchange {
  /** Consignes générales envoyées au modèle. */
  system: string
  /** Contexte de la demande (marché, positions, réglages…). */
  user: string
  /** Arguments renvoyés par le modèle ; null en cas d'échec. */
  response: unknown
  usage: { in: number; out: number }
  error: string
  /** Absents d'un échange de backtest. */
  at?: string
  provider?: string
  model?: string
  status?: ExchangeState
  seconds?: number
}
