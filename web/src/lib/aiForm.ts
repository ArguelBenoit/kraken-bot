/** Formulaire des réglages du Bot IA : champs numériques et leurs libellés. */

/** Réglages numériques : saisis comme du texte dans le formulaire, convertis en nombres à l'envoi. */
export const AI_NUMERIC_KEYS = [
  'timeframe', 'interval_min', 'check_every', 'max_positions', 'order_size', 'budget', 'max_exposure_pct',
  'max_daily_loss_pct', 'max_calls_per_day', 'fee_pct', 'price_in', 'price_out', 'credit_base',
] as const
export type AiNumericKey = (typeof AI_NUMERIC_KEYS)[number]

export interface NumberField {
  name: AiNumericKey
  label: string
  step?: string
  min?: number
  max?: number
}

/** Nombre de trades en parallèle (affiché avant le choix de la bougie). */
export const PARALLEL_FIELD: NumberField = { name: 'max_positions', label: 'Trades en parallèle (1-5)', min: 1, max: 5, step: '1' }

/** Rythme, montants et garde-fous (affichés après le choix de la bougie). */
export const LIMIT_FIELDS: NumberField[] = [
  { name: 'interval_min', label: 'Analyse Claude toutes les (min)', step: '1' },
  { name: 'check_every', label: 'Contrôle des stops (sec)', step: '1' },
  { name: 'order_size', label: 'Montant par trade' },
  { name: 'budget', label: 'Budget alloué' },
  { name: 'max_exposure_pct', label: 'Exposition max (% budget)' },
  { name: 'max_daily_loss_pct', label: 'Perte jour max (% budget)' },
  { name: 'max_calls_per_day', label: 'Appels Claude max / jour', step: '1' },
  { name: 'fee_pct', label: 'Frais / ordre (%)' },
]

/** Estimation du coût Claude (groupe repliable). */
export const COST_FIELDS: NumberField[] = [
  { name: 'price_in', label: 'Prix entrée ($ / M tokens)' },
  { name: 'price_out', label: 'Prix sortie ($ / M tokens)' },
  { name: 'credit_base', label: 'Crédit restant (console, $)' },
]
