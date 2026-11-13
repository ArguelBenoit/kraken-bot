/** Calculs du formulaire de backtest (purs). */
import { LIMIT_FIELDS, type AiNumericKey, type NumberField } from './aiForm'
import type { BtState, BtStats } from './types'

/** Nombre d'analyses (donc d'appels au modèle) d'un essai : une toutes les `interval` minutes, au mieux une par bougie. */
export const estimateCalls = (days: number, timeframe: number, interval: number): number =>
  days > 0 && timeframe > 0 ? Math.ceil((days * 1440) / timeframe / Math.max(1, Math.round(interval / timeframe))) : 0

/** Libellé de l'état d'un essai. */
export const BT_LABEL: Record<BtState, string> = {
  loading: 'téléchargement des bougies', running: 'en cours', paused: 'en pause', done: 'terminé', cancelled: 'annulé', stopped: 'arrêté', error: 'erreur',
}

/** L'essai n'est-il pas terminé (téléchargement, calcul ou pause) ? */
export const isActive = (s: BtState) => s === 'loading' || s === 'running' || s === 'paused'

/** Les statistiques sont-elles disponibles (au moins une bougie rejouée) ? */
export const hasStats = (s: BtStats | Record<string, never>): s is BtStats => 'return_pct' in s

/** Réglages numériques repris du formulaire du Bot IA ; `check_every` et `max_calls_per_day` n'ont pas de sens ici (les stops sont testés à chaque bougie, le plafond d'appels est propre au backtest). */
export const BT_NUMERIC_KEYS = [
  'interval_min', 'max_positions', 'order_size', 'budget', 'max_exposure_pct', 'max_daily_loss_pct', 'min_reward_risk', 'max_leverage', 'fee_pct',
] as const satisfies readonly AiNumericKey[]
export type BtNumericKey = (typeof BT_NUMERIC_KEYS)[number]

/** Champs de limites du Bot IA affichés dans le backtest (mêmes libellés et infobulles). */
export const BT_LIMIT_FIELDS: NumberField[] = LIMIT_FIELDS.filter((f) => (BT_NUMERIC_KEYS as readonly string[]).includes(f.name))

/** Champs facultatifs : vide = aucune restriction (envoyé `null`) ; les autres, vides, gardent la valeur des réglages du Bot IA. */
export const BT_OPTIONAL_KEYS: readonly BtNumericKey[] = ['max_exposure_pct', 'max_daily_loss_pct', 'min_reward_risk', 'fee_pct']
