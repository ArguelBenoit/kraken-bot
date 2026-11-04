import { FILTER_TFS, PAIRS, STRATEGY_OPTIONS, TIMEFRAMES } from './constants'
import type { BotConfig, Mode, Strategy } from './types'

export interface FieldDef {
  name: keyof BotConfig
  label: string
  kind: 'number' | 'select'
  step?: string
  options?: { value: string | number; label: string }[]
  /** Méthodes pour lesquelles le champ est affiché (absent = toujours). */
  only?: Strategy[]
  /** Visible uniquement dans ce mode (ex. capital paper). */
  mode?: Mode
}

const num = (name: keyof BotConfig, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({
  name, label, kind: 'number', step: 'any', ...extra,
})
const sel = (name: keyof BotConfig, label: string, options: FieldDef['options'], extra: Partial<FieldDef> = {}): FieldDef => ({
  name, label, kind: 'select', options, ...extra,
})

const TRAIL: Strategy[] = ['trend', 'donchian', 'macd', 'momentum']

/** Lignes du formulaire de réglages : une ligne = un groupe de champs côte à côte. Les champs masqués disparaissent. */
export const FORM_ROWS: FieldDef[][] = [
  [sel('pair', 'Paire', PAIRS.map(([value, label]) => ({ value, label }))), sel('strategy', 'Méthode', STRATEGY_OPTIONS)],
  [sel('timeframe', 'Timeframe (min)', TIMEFRAMES), num('rsi_period', 'Période RSI', { only: ['rsi'] }), num('ma_fast', 'EMA rapide', { only: ['trend'] })],
  [num('order_size', "Taille d'ordre (stable)")],
  [num('rsi_buy', 'Achat si RSI ≤', { only: ['rsi'] }), num('rsi_sell', 'Vente si RSI ≥', { only: ['rsi'] })],
  [num('ma_slow', 'EMA lente', { only: ['trend'] })],
  [num('bb_period', 'Période', { only: ['bollinger'] }), num('bb_std', 'Écarts-types', { only: ['bollinger'] })],
  [num('dc_entry', 'Cassure (bougies)', { only: ['donchian'] }), num('dc_exit', 'Sortie (bougies)', { only: ['donchian'] })],
  [num('macd_fast', 'EMA rapide', { only: ['macd'] }), num('macd_slow', 'EMA lente', { only: ['macd'] })],
  [num('macd_signal', 'Signal (EMA)', { only: ['macd'] })],
  [num('mom_period', 'Période (bougies)', { only: ['momentum'] }), num('mom_min_pct', 'Hausse min %', { only: ['momentum'] })],
  [num('trailing_pct', 'Stop suiveur %', { only: TRAIL })],
  [num('take_profit_pct', 'Take profit %', { only: ['rsi', 'bollinger'] }), num('stop_loss_pct', 'Stop loss %')],
  [num('filter_ema', 'Filtre EMA'), sel('filter_tf', 'Filtre bougie', FILTER_TFS)],
  [num('atr_stop', 'Stop ATR × (0 = stop en %)')],
  [num('fee_pct', 'Frais %')],
  [num('check_every', 'Analyse toutes les (s)')],
  [num('paper_balance', 'Capital paper', { mode: 'paper' })],
]

/** Tous les champs du formulaire, à plat. */
export const ALL_FIELDS: FieldDef[] = FORM_ROWS.flat()

/** Valeurs du formulaire de réglages (texte tant que l'utilisateur tape). */
export type FormValues = Partial<Record<keyof BotConfig, string | number>>

const FORM_NAMES = new Set<string>(ALL_FIELDS.map((f) => f.name))
/** Ne garde, d'une config / d'une proposition de Claude, que les champs présents dans le formulaire. */
export const formValues = (c: object): FormValues => Object.fromEntries(Object.entries(c).filter(([k]) => FORM_NAMES.has(k))) as FormValues
/** Un champ est-il affiché pour cette méthode et ce mode ? */
export const isVisible = (f: FieldDef, strategy: Strategy, mode: Mode) =>
  (!f.only || f.only.includes(strategy)) && (!f.mode || f.mode === mode)

const TEXT_KEYS: (keyof BotConfig)[] = ['pair', 'strategy']

/** Valeurs du formulaire (texte libre) -> corps JSON typé pour l'API. */
export function toPayload(draft: Partial<Record<keyof BotConfig, string | number>>): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(draft)) out[k] = TEXT_KEYS.includes(k as keyof BotConfig) ? String(v) : Number(v)
  return out
}
