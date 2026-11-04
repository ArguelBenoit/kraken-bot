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
  /** Infobulle affichée à côté du libellé. */
  tip: string
  step?: string
  min?: number
  max?: number
}

/** Nombre de trades en parallèle (affiché avant le choix de la bougie). */
export const PARALLEL_FIELD: NumberField = { name: 'max_positions', label: 'Trades en parallèle (1-5)', min: 1, max: 5, step: '1',
  tip: "Nombre maximum de positions ouvertes en même temps (une seule par paire). Claude ne peut pas en ouvrir davantage." }

/** Rythme, montants et garde-fous (affichés après le choix de la bougie). */
export const LIMIT_FIELDS: NumberField[] = [
  { name: 'interval_min', label: 'Analyse Claude toutes les (min)', step: '1',
    tip: "Délai entre deux analyses du marché par Claude. Chaque analyse est un appel payant : plus c'est court, plus ça coûte. Le bouton « Analyser maintenant » en déclenche une à la demande." },
  { name: 'check_every', label: 'Contrôle des stops (sec)', step: '1',
    tip: "Fréquence à laquelle le programme vérifie localement stop loss, objectifs et stops suiveurs. Claude n'est pas appelé à ces contrôles. Aucun stop n'est posé chez Kraken : si le programme s'arrête, rien ne se déclenche." },
  { name: 'order_size', label: 'Montant par trade',
    tip: "Montant de base engagé par trade (en stablecoin). Claude peut le moduler selon sa confiance, dans la limite imposée par l'agressivité (de 0,6× à 1,5×)." },
  { name: 'budget', label: 'Budget alloué',
    tip: "Capital réservé au Bot IA. En paper, c'est le cash de départ simulé. Sert de base aux pourcentages d'exposition et de perte journalière." },
  { name: 'max_exposure_pct', label: 'Exposition max (% budget)',
    tip: "Part maximale du budget investie en même temps. Au-delà, plus aucune ouverture tant que des positions restent ouvertes." },
  { name: 'max_daily_loss_pct', label: 'Perte jour max (% budget)',
    tip: "Si la perte réalisée du jour dépasse ce pourcentage du budget, plus aucune nouvelle position n'est ouverte jusqu'à demain." },
  { name: 'max_calls_per_day', label: 'Appels Claude max / jour', step: '1',
    tip: "Plafond d'appels à l'API Claude par jour, quelle qu'en soit la cause. Protège ton crédit Anthropic." },
  { name: 'fee_pct', label: 'Frais / ordre (%)',
    tip: "Frais Kraken estimés par ordre (0,26 % en taker), soit environ 0,5 % l'aller-retour. Sert au calcul du PnL." },
]

/** Estimation du coût Claude (groupe repliable). */
export const COST_FIELDS: NumberField[] = [
  { name: 'price_in', label: 'Prix entrée ($ / M tokens)',
    tip: "Prix du modèle choisi, en dollars par million de tokens envoyés à Claude. À copier depuis la console Anthropic : il sert à estimer le coût." },
  { name: 'price_out', label: 'Prix sortie ($ / M tokens)',
    tip: "Prix du modèle choisi, en dollars par million de tokens générés par Claude. À copier depuis la console Anthropic." },
  { name: 'credit_base', label: 'Crédit restant (console, $)',
    tip: "Ton solde actuel lu dans la console Anthropic. L'API ne le donne pas : saisis-le pour recaler l'estimation du crédit restant." },
]
