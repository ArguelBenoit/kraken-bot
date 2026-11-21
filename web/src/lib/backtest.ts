/** Calculs du formulaire de backtest (purs). */
import { EDGE_FIELDS, MONEY_FIELDS, RHYTHM_FIELDS, type AiNumericKey, type NumberField } from './aiForm'
import type { Aggressiveness, BtScenario, BtState, BtStats } from './types'

/** Nombre d'analyses (donc d'appels au modèle) d'un essai : une toutes les `interval` minutes, au mieux une par bougie. */
export const estimateCalls = (days: number, timeframe: number, interval: number): number =>
  days > 0 && timeframe > 0 ? Math.ceil((days * 1440) / timeframe / Math.max(1, Math.round(interval / timeframe))) : 0

/** Libellé de l'état d'un essai. */
export const BT_LABEL: Record<BtState, string> = {
  loading: 'téléchargement des bougies', running: 'en cours', paused: 'en pause', done: 'terminé', cancelled: 'annulé', stopped: 'arrêté', error: 'erreur',
}

/** Libellé du profil d'agressivité. */
export const AGGR_LABEL: Record<Aggressiveness, string> = { prudent: 'prudent', equilibre: 'équilibré', agressif: 'agressif' }

/** L'essai n'est-il pas terminé (téléchargement, calcul ou pause) ? */
export const isActive = (s: BtState) => s === 'loading' || s === 'running' || s === 'paused'

/** Les statistiques sont-elles disponibles (au moins une bougie rejouée) ? */
export const hasStats = (s: BtStats | Record<string, never>): s is BtStats => 'return_pct' in s

/** Réglages numériques repris du formulaire du Bot IA ; `check_every` et `max_calls_per_day` n'ont pas de sens ici (les stops sont testés à chaque bougie, le plafond d'appels est propre au backtest). */
export const BT_NUMERIC_KEYS = [
  'interval_min', 'max_positions', 'order_size', 'budget', 'max_exposure_pct', 'max_daily_loss_pct', 'min_reward_risk', 'max_leverage', 'fee_pct', 'short_fee_pct',
  'max_same_side', 'max_drawdown_pct', 'drawdown_days', 'cooldown_hours', 'temperature',
] as const satisfies readonly AiNumericKey[]
export type BtNumericKey = (typeof BT_NUMERIC_KEYS)[number]

/** Réglages de « Protection du capital » (et la température) : le formulaire les laisse vides au départ (aucune restriction), même si le Bot IA en a. */
export const BT_STABILITY_KEYS: readonly BtNumericKey[] = ['max_same_side', 'max_drawdown_pct', 'drawdown_days', 'cooldown_hours', 'temperature']

/** Champs du Bot IA repris dans le backtest (mêmes libellés et infobulles), par groupe ; `check_every` et `max_calls_per_day` n'y figurent pas. */
const inBacktest = (fields: NumberField[]) => fields.filter((f) => (BT_NUMERIC_KEYS as readonly string[]).includes(f.name))
export const BT_RHYTHM_FIELDS = inBacktest(RHYTHM_FIELDS)
export const BT_MONEY_FIELDS = inBacktest(MONEY_FIELDS)
export const BT_EDGE_FIELDS = inBacktest(EDGE_FIELDS)

/** Champs facultatifs : vide = aucune restriction (envoyé `null`) ; les autres, vides, gardent la valeur des réglages du Bot IA. */
export const BT_OPTIONAL_KEYS: readonly BtNumericKey[] = ['max_exposure_pct', 'max_daily_loss_pct', 'min_reward_risk', 'fee_pct', 'short_fee_pct', 'max_same_side', 'max_drawdown_pct', 'cooldown_hours', 'temperature']

/** Nom d'une tendance de marché. */
export const TREND_LABEL: Record<BtScenario['trend'], string> = { hausse: 'Hausse', baisse: 'Baisse', range: 'Sans tendance' }

/** Sens du marché d'un essai, en un mot : tendance du scénario, « Actuel » (dernières bougies) ou « Autre date ». */
export function trendLabel(end: string | null | undefined, scenarios: readonly BtScenario[]): string {
  if (!end) return 'Actuel'
  const sc = scenarios.find((x) => x.end === end)
  return sc ? TREND_LABEL[sc.trend] : 'Autre date'
}

/** Marché d'un essai en clair : scénario connu (tendance, période), autre date passée, ou dernières bougies de Kraken (`end` vide). */
export function marketLabel(end: string | null | undefined, scenarios: readonly BtScenario[]): string {
  if (!end) return 'Aujourd’hui · dernières bougies (Kraken)'
  const sc = scenarios.find((x) => x.end === end)
  return sc ? `${TREND_LABEL[sc.trend]} · ${sc.when} (fin ${end}, Binance)` : `Autre date · fin ${end} (Binance)`
}
