/** Lecture de la configuration enregistrée du Bot IA (celle qui tourne) et comparaison avec le formulaire. */
import { AI_TFS } from '@/lib/constants'
import { AGGR_LABEL } from '@/lib/backtest'
import { EDGE_FIELDS, MONEY_FIELDS, PARALLEL_FIELD, RHYTHM_FIELDS, SHORT_FEE_FIELD, SHORT_FIELD, STABILITY_FIELDS, TEMPERATURE_FIELD, type NumberField } from '@/lib/aiForm'
import type { AiConfig } from '@/lib/types'

/** Une ligne de la configuration active : clé du réglage, libellé et valeur en clair. */
export interface ConfigRow {
  key: keyof AiConfig
  label: string
  value: string
}

const NUMBER_FIELDS: NumberField[] = [
  TEMPERATURE_FIELD, ...RHYTHM_FIELDS, PARALLEL_FIELD, ...MONEY_FIELDS, ...EDGE_FIELDS, SHORT_FIELD, SHORT_FEE_FIELD, ...STABILITY_FIELDS,
]

const yesNo = (on: boolean) => (on ? 'oui' : 'non')

/** Valeur lisible d'un réglage (liste, nombre vide = sans restriction, booléen…). `pairLabel` donne le nom court d'une paire. */
function show(key: keyof AiConfig, cfg: AiConfig, pairLabel: (pair: string) => string): string {
  const v = cfg[key]
  if (key === 'timeframe') return AI_TFS.find((t) => t.value === v)?.label ?? String(v)
  if (key === 'aggressiveness') return AGGR_LABEL[cfg.aggressiveness]
  if (key === 'strategies' || key === 'pairs') return (v as string[]).map((x) => (key === 'pairs' ? pairLabel(x) : x)).join(', ') || 'aucune'
  if (key === 'notes') return v ? String(v) : 'aucune'
  if (typeof v === 'boolean') return yesNo(v)
  if (v === null) return NUMBER_FIELDS.find((f) => f.name === key)?.empty ?? '–'
  return String(v)
}

/** Libellés des réglages non numériques. */
const OTHER_LABELS: [keyof AiConfig, string][] = [
  ['mode', 'Mode'], ['model', 'Modèle'], ['aggressiveness', 'Agressivité'], ['timeframe', 'Bougie analysée'],
  ['allow_short', 'Shorts autorisés'], ['trend_filter', 'Filtre de tendance'], ['strategies', 'Stratégies'], ['pairs', 'Paires'], ['notes', 'Consignes libres'],
]

/** Tous les réglages enregistrés, dans l'ordre d'affichage. */
export function configRows(cfg: AiConfig, pairLabel: (pair: string) => string): ConfigRow[] {
  const label = (k: keyof AiConfig) => OTHER_LABELS.find(([key]) => key === k)?.[1] ?? NUMBER_FIELDS.find((f) => f.name === k)?.label ?? k
  const keys: (keyof AiConfig)[] = [
    'mode', 'model', 'temperature', 'aggressiveness', 'timeframe', 'interval_min', 'check_every', 'max_positions', 'budget', 'order_size',
    'max_exposure_pct', 'max_daily_loss_pct', 'min_reward_risk', 'fee_pct', 'max_calls_per_day', 'allow_short', 'max_leverage', 'short_fee_pct',
    'trend_filter', 'max_same_side', 'max_drawdown_pct', 'drawdown_days', 'cooldown_hours', 'strategies', 'pairs', 'notes',
  ]
  return keys.map((key) => ({ key, label: label(key), value: key === 'model' ? `${cfg.provider} · ${cfg.model}` : show(key, cfg, pairLabel) }))
}

/** Réglages du formulaire qui diffèrent de la configuration enregistrée (le mode ne se règle pas dans le formulaire). */
export function changedKeys(draft: Record<string, unknown>, cfg: AiConfig): (keyof AiConfig)[] {
  const same = (a: unknown, b: unknown) => (Array.isArray(a) && Array.isArray(b) ? [...a].sort().join() === [...b].sort().join() : String(a ?? '') === String(b ?? ''))
  return (Object.keys(cfg) as (keyof AiConfig)[]).filter((k) => k !== 'mode' && k !== 'provider' && !same(draft[k], cfg[k]))
}
