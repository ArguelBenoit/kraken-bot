/** Formulaire des réglages du Bot IA : champs numériques et leurs libellés. */

/** Réglages numériques : saisis comme du texte dans le formulaire, convertis en nombres à l'envoi. */
export const AI_NUMERIC_KEYS = [
  'timeframe', 'interval_min', 'check_every', 'max_positions', 'order_size', 'budget', 'max_exposure_pct',
  'max_daily_loss_pct', 'max_calls_per_day', 'min_reward_risk', 'fee_pct',
] as const
export type AiNumericKey = (typeof AI_NUMERIC_KEYS)[number]

export interface NumberField {
  name: AiNumericKey
  label: string
  /** Infobulle affichée à côté du libellé. */
  tip: string
  step?: string
  /** Champ facultatif : texte affiché quand il est vide (= ce que vide signifie). */
  empty?: string
  min?: number
  max?: number
}

/** Nombre de trades en parallèle (affiché avant le choix de la bougie). */
export const PARALLEL_FIELD: NumberField = { name: 'max_positions', label: 'Trades en parallèle (1-5)', min: 1, max: 5, step: '1',
  tip: "Nombre maximum de positions ouvertes en même temps (une seule par paire). Le modèle ne peut pas en ouvrir davantage." }

/** Rythme, montants et garde-fous (affichés après le choix de la bougie). */
export const LIMIT_FIELDS: NumberField[] = [
  { name: 'interval_min', label: 'Analyse toutes les (min)', step: '1',
    tip: "Délai entre deux analyses du marché par le modèle. Chaque analyse est un appel (payant chez la plupart des fournisseurs) : plus c'est court, plus ça consomme. Le bouton « Analyser maintenant » en déclenche une à la demande." },
  { name: 'check_every', label: 'Contrôle des stops (sec)', step: '1',
    tip: "Fréquence à laquelle le programme vérifie localement stop loss, objectifs et stops suiveurs. Le modèle n'est pas appelé à ces contrôles. En live, le stop loss (ou à défaut le stop suiveur) est aussi posé chez Kraken et protège la position même si le programme s'arrête ; l'objectif reste local." },
  { name: 'order_size', label: 'Montant par trade',
    tip: "Montant de base engagé par trade (en stablecoin). Le modèle peut le moduler selon sa confiance, dans la limite imposée par l'agressivité (de 0,6× à 1,5×)." },
  { name: 'budget', label: 'Budget alloué',
    tip: "Capital réservé au Bot IA. En paper, c'est le cash de départ simulé. Sert de base aux pourcentages d'exposition et de perte journalière." },
  { name: 'max_exposure_pct', label: 'Exposition max (% budget)', empty: 'illimitée',
    tip: "Part maximale du budget investie en même temps. Au-delà, plus aucune ouverture tant que des positions restent ouvertes. Vide = aucune limite." },
  { name: 'max_daily_loss_pct', label: 'Perte jour max (% budget)', empty: 'illimitée',
    tip: "Si la perte réalisée du jour dépasse ce pourcentage du budget, plus aucune nouvelle position n'est ouverte jusqu'à demain. Vide = aucune limite." },
  { name: 'max_calls_per_day', label: 'Appels max / jour', step: '1', min: 1, empty: 'illimités',
    tip: "Nombre maximum d'appels au modèle par jour, quelle qu'en soit la cause (analyse programmée ou bouton). Protège ton crédit chez le fournisseur. Vide = aucune limite (modèle local par exemple) ; le compteur du jour s'affiche quand même." },
  { name: 'min_reward_risk', label: 'Gain/risque min', step: '0.1', min: 0.5, empty: 'aucun',
    tip: "Rapport minimum objectif ÷ stop loss (TP ÷ SL) d'une ouverture : SL 3 % et TP 4,5 % font 1,5. En dessous, le code refuse l'ordre ; il refuse aussi un changement d'objectif qui passerait sous ce minimum. Avec les frais (≈ 0,5 %), 1,5 est un minimum raisonnable ; entre 1,5 et 3 est cohérent. Sans objectif (stop suiveur seul), aucun contrôle. Vide = aucune restriction." },
  { name: 'fee_pct', label: 'Frais / ordre (%)', empty: '0',
    tip: "Frais Kraken estimés par ordre (0,26 % en taker), soit environ 0,5 % l'aller-retour. Sert au calcul du PnL. Vide = 0." },
]
