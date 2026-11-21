/** Formulaire des réglages du Bot IA : champs numériques et leurs libellés. */
import type { AiPreset } from '@/lib/types'

/** Réglages numériques : saisis comme du texte dans le formulaire, convertis en nombres à l'envoi. */
export const AI_NUMERIC_KEYS = [
  'timeframe', 'interval_min', 'check_every', 'max_positions', 'order_size', 'budget', 'max_exposure_pct',
  'max_daily_loss_pct', 'max_calls_per_day', 'min_reward_risk', 'max_leverage', 'fee_pct', 'short_fee_pct',
  'max_same_side', 'max_drawdown_pct', 'drawdown_days', 'cooldown_hours', 'temperature',
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
export const PARALLEL_FIELD: NumberField = { name: 'max_positions', label: 'Trades en parallèle (1-10)', min: 1, max: 10, step: '1',
  tip: "Nombre maximum de positions ouvertes en même temps (une seule par paire). Le modèle ne peut pas en ouvrir davantage." }

/** Rythme du bot (affiché après le choix de la bougie). */
export const RHYTHM_FIELDS: NumberField[] = [
  { name: 'interval_min', label: 'Analyse toutes les (min)', step: '1',
    tip: "Délai entre deux analyses du marché par le modèle. Chaque analyse est un appel (payant chez la plupart des fournisseurs) : plus c'est court, plus ça consomme. Le bouton « Analyser maintenant » en déclenche une à la demande." },
  { name: 'check_every', label: 'Contrôle des stops (sec)', step: '1',
    tip: "Fréquence à laquelle le programme vérifie localement stop loss, objectifs et stops suiveurs. Le modèle n'est pas appelé à ces contrôles. En live, le stop loss (ou à défaut le stop suiveur) est aussi posé chez Kraken et protège la position même si le programme s'arrête ; l'objectif reste local." },
]

/** Capital et limites de perte (affichés après le nombre de trades en parallèle). */
export const MONEY_FIELDS: NumberField[] = [
  { name: 'budget', label: 'Budget alloué',
    tip: "Capital réservé au Bot IA. En paper, c'est le cash de départ simulé. Sert de base aux pourcentages d'exposition et de perte journalière." },
  { name: 'order_size', label: 'Montant par trade',
    tip: "Montant de base engagé par trade (en stablecoin). Le modèle peut le moduler selon sa confiance, dans la limite imposée par l'agressivité (de 0,6× à 1,5×)." },
  { name: 'max_exposure_pct', label: 'Exposition max (% budget)', empty: 'illimitée',
    tip: "Part maximale du budget investie en même temps. Au-delà, plus aucune ouverture tant que des positions restent ouvertes. Vide = aucune limite." },
  { name: 'max_daily_loss_pct', label: 'Perte jour max (% budget)', empty: 'illimitée',
    tip: "Si la perte réalisée du jour dépasse ce pourcentage du budget, plus aucune nouvelle position n'est ouverte jusqu'à demain. Vide = aucune limite." },
]

/** Rentabilité exigée, frais du long et plafond d'appels au modèle. */
export const EDGE_FIELDS: NumberField[] = [
  { name: 'min_reward_risk', label: 'Gain/risque min', step: '0.1', min: 0.5, empty: 'aucun',
    tip: "Rapport minimum objectif ÷ stop loss (TP ÷ SL) d'une ouverture : SL 3 % et TP 4,5 % font 1,5. En dessous, le code refuse l'ordre ; il refuse aussi un changement d'objectif qui passerait sous ce minimum. Ce rapport est calculé net de frais : (TP − frais aller-retour) ÷ (SL + frais aller-retour). Avec 1, la perte possible ne dépasse jamais le gain possible ; 1,5 à 3 est cohérent. Sans objectif (stop suiveur seul), aucun contrôle. Vide = aucune restriction." },
  { name: 'fee_pct', label: 'Frais / ordre long (%)', empty: '0',
    tip: "Frais Kraken d'un ordre d'achat ou de vente d'un long, en % du montant (0,26 % en taker par défaut ; vide = 0 si ton abonnement n'en prend pas). Sert au calcul du PnL et au gain/risque net." },
  { name: 'max_calls_per_day', label: 'Appels max / jour', step: '1', min: 1, empty: 'illimités',
    tip: "Nombre maximum d'appels au modèle par jour, quelle qu'en soit la cause (analyse programmée ou bouton). Protège ton crédit chez le fournisseur. Vide = aucune limite (modèle local par exemple) ; le compteur du jour s'affiche quand même." },
]

/** Frais par ordre d'un short (affiché sous le levier, avec les frais de marge et de report estimés par le code). */
export const SHORT_FEE_FIELD: NumberField = { name: 'short_fee_pct', label: 'Frais / ordre short (%)', empty: '0',
  tip: "Frais Kraken d'un ordre d'ouverture ou de rachat d'un short, en % du montant vendu (0,26 % en taker par défaut ; vide = 0). S'y ajoutent les frais d'ouverture de marge (0,02 %) et le report (0,02 % toutes les 4 h). Sert au calcul du PnL et au gain/risque net." }

/** Levier maximum d'un short (affiché sous la case « Autoriser les shorts »). */
export const SHORT_FIELD: NumberField = { name: 'max_leverage', label: 'Levier max (short)', step: '0.5', min: 2, max: 5,
  tip: "Levier maximum que le modèle peut choisir pour un short (2 à 5). Plus bas = plus sûr : la liquidation estimée est à +0,8 ÷ levier (+40 % à ×2, +16 % à ×5)." }

/** Température du modèle (affichée sous le choix du modèle). */
export const TEMPERATURE_FIELD: NumberField = { name: 'temperature', label: 'Température du modèle', step: '0.1', min: 0, max: 1, empty: 'défaut du modèle',
    tip: "Plus bas = réponses plus répétables d'un essai à l'autre (0 = quasi déterministe). Vide = valeur par défaut du fournisseur. Certains modèles (raisonnement) refusent de la changer : l'erreur s'affiche alors dans le journal." }

/** Case « Filtre de tendance » (affichée dans la protection du capital). */
export const TREND_FILTER_TIP = "Le code refuse un achat quand l'EMA20 est sous l'EMA50 de la paire (tendance baissière) et un short quand elle est au-dessus. Le bot suit alors le sens du marché au lieu d'aller à contre-courant : c'est le réglage qui évite le plus de pertes en marché baissier ou haussier. Désactivé par défaut."

/** Protection du capital (tous réglages facultatifs : vide = désactivé), affichés dans un bloc repliable. */
export const STABILITY_FIELDS: NumberField[] = [
  { name: 'max_same_side', label: 'Positions max dans le même sens', step: '1', min: 1, max: 10, empty: 'aucun plafond',
    tip: "Nombre maximum d'achats ouverts en même temps, et de shorts. Les cryptos bougent ensemble : 5 achats sont souvent un seul gros pari. Plafonner par sens oblige le bot à répartir le risque. Vide = aucun plafond." },
  { name: 'max_drawdown_pct', label: 'Disjoncteur (% de baisse)', step: '0.5', min: 1, max: 50, empty: 'désactivé',
    tip: "Si l'équité du bot perd ce pourcentage depuis son plus haut des derniers jours (voir la fenêtre ci-dessous), plus aucune position n'est ouverte ; les positions existantes continuent d'être gérées. Quand ce plus haut sort de la fenêtre, le bot rouvre : il n'est jamais bloqué définitivement. Vide = désactivé." },
  { name: 'drawdown_days', label: 'Fenêtre du disjoncteur (jours)', step: '1', min: 1, max: 30, empty: '3',
    tip: "Le disjoncteur compare l'équité à son plus haut des N derniers jours (3 par défaut). Plus la fenêtre est courte, plus vite le bot rouvre après une baisse ; plus elle est longue, plus il reste prudent. Sans effet si le disjoncteur est désactivé." },
  { name: 'cooldown_hours', label: 'Délai après un stop (heures)', step: '0.5', min: 0.5, max: 168, empty: 'aucun délai',
    tip: "Après un stop loss, un stop suiveur ou une liquidation, le code refuse de rouvrir la même paire dans le même sens pendant ce nombre d'heures. Évite de racheter ou de re-shorter aussitôt un marché qui vient de se retourner. Un objectif atteint ou une fermeture à la main ne déclenchent pas ce délai. Vide = aucun délai." },
]

/** Champs d'un formulaire (Bot IA ou backtest) à remplacer pour appliquer un préréglage : nombres en texte (vide si absent), le reste tel quel. */
export function presetPatch(p: AiPreset, has: (key: string) => boolean): Record<string, unknown> {
  const numeric: readonly string[] = AI_NUMERIC_KEYS
  return Object.fromEntries(
    Object.entries(p.values)
      .filter(([k]) => has(k))
      .map(([k, v]) => [k, numeric.includes(k) ? String(v ?? '') : Array.isArray(v) ? [...v] : v]),
  )
}
