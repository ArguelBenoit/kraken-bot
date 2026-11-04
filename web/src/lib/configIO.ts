import { CFG_KEYS } from './fields'
import { FILTER_TFS, PAIRS, STRATEGY_VALUES, TIMEFRAMES } from './constants'
import type { BotConfig } from './types'

export interface ParsedConfig {
  values: Partial<Record<keyof BotConfig, string | number>>
  applied: string[]
  ignored: string[]
}

/** Extrait un objet JSON d'un texte collé (tolère ```json … ``` et du texte autour). */
export function parseJsonLoose(text: string): Record<string, unknown> | null {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  for (const candidate of [t, t.match(/\{[\s\S]*\}/)?.[0]]) {
    if (!candidate) continue
    try {
      const v = JSON.parse(candidate)
      if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>
    } catch { /* essai suivant */ }
  }
  return null
}

/** Valide une config collée : ne garde que les champs connus aux valeurs autorisées (le mode n'est jamais modifié). */
export function sanitizeConfig(raw: Record<string, unknown>): ParsedConfig {
  const values: ParsedConfig['values'] = {}
  const applied: string[] = []
  const ignored: string[] = []
  for (const [k, v] of Object.entries(raw)) {
    if (!(CFG_KEYS as string[]).includes(k)) {
      if (k !== 'mode') ignored.push(k)
      continue
    }
    const key = k as keyof BotConfig
    const s = String(v)
    if (key === 'pair' && !PAIRS.some(([p]) => p === s.toUpperCase())) { ignored.push(`pair ${s}`); continue }
    if (key === 'timeframe' && !TIMEFRAMES.some((t) => String(t.value) === s)) { ignored.push(`timeframe ${s}`); continue }
    if (key === 'filter_tf' && !FILTER_TFS.some((t) => String(t.value) === s)) { ignored.push(`filter_tf ${s}`); continue }
    if (key === 'strategy' && !(STRATEGY_VALUES as string[]).includes(s.toLowerCase())) { ignored.push(`strategy ${s}`); continue }
    values[key] = key === 'pair' ? s.toUpperCase() : key === 'strategy' ? s.toLowerCase() : (v as string | number)
    applied.push(k)
  }
  return { values, applied, ignored }
}
