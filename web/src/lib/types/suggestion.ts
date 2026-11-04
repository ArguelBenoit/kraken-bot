/** Proposition de Claude pour le mode IA du bot simple. */
import type { BotConfig } from './bot'

export interface Suggestion {
  rationale: string
  market_view: string
  /** 0 à 1 ; null si Claude ne l'a pas donnée. */
  confidence: number | null
  /** Claude ne voit aucun avantage net maintenant : mieux vaut ne pas trader. */
  no_edge: boolean
  has_position: boolean
  model: string
  config: Partial<BotConfig>
}
