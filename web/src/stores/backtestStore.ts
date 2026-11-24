import { create } from 'zustand'
import { api, errMsg } from '@/lib/api'
import { presetPatch } from '@/lib/aiForm'
import { BT_NUMERIC_KEYS, BT_OPTIONAL_KEYS, BT_STABILITY_KEYS, type BtNumericKey } from '@/lib/backtest'
import type { Aggressiveness, AiPreset, BtRun, BtStatus } from '@/lib/types'
import { runAction } from './runAction'
import { toast } from './uiStore'

/** Brouillon du formulaire : les nombres restent du texte tant qu'on tape (vide = sans limite pour les champs facultatifs). */
export interface BtDraft extends Record<BtNumericKey, string> {
  provider: string
  model: string
  pairs: string[]
  strategies: string[]
  timeframe: string
  days: string
  aggressiveness: Aggressiveness
  allow_short: boolean
  trend_filter: boolean
  notes: string
  max_calls: string
  /** Fin de la période (AAAA-MM-JJ) d'un marché passé ; vide (défaut) = les dernières bougies de Kraken. */
  end: string
}

interface BacktestStore {
  status: BtStatus | null
  draft: BtDraft | null
  /** Essai gardé ouvert depuis l'historique ; null = on suit l'essai courant. */
  viewing: BtRun | null

  refresh: () => Promise<void>
  setField: <K extends keyof BtDraft>(name: K, value: BtDraft[K]) => void
  toggleIn: (name: 'pairs' | 'strategies', value: string) => void
  applyPreset: (p: AiPreset) => void
  start: () => Promise<void>
  /** Ajoute à la file les réglages du formulaire, un essai par combinaison des axes (chaque axe = liste de réglages partiels ; aucun axe = un seul essai). */
  enqueue: (axes?: Record<string, unknown>[][]) => Promise<boolean>
  queueRun: () => Promise<void>
  queueStop: () => Promise<void>
  queueClear: () => Promise<void>
  queueRemove: (id: string) => Promise<void>
  cancel: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  open: (id: string) => Promise<void>
  /** Revient à l'essai courant. */
  closeView: () => void
  remove: (id: string) => Promise<void>
}

/** Valeurs de départ du formulaire : réglages du Bot IA (sauf la protection du capital, laissée vide), durée de 2 semaines (ou le maximum si la bougie ne le permet pas). */
function initialDraft(o: BtStatus['options']): BtDraft {
  const d = o.defaults
  const max = o.max_days[String(d.timeframe)] ?? 14
  const numbers = Object.fromEntries(BT_NUMERIC_KEYS.map((k) => [k, d[k] == null || BT_STABILITY_KEYS.includes(k) ? '' : String(d[k])])) as Record<BtNumericKey, string>
  return {
    ...numbers, provider: d.provider, model: d.model, pairs: [...d.pairs], strategies: [...d.strategies], timeframe: String(d.timeframe),
    days: String(Math.min(14, max)), aggressiveness: d.aggressiveness, allow_short: d.allow_short, trend_filter: false, notes: d.notes, max_calls: '', end: '',
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined

/** Enregistre le formulaire sur le serveur une demi-seconde après la dernière modification (il suit ainsi d'une machine à l'autre). */
function saveSoon(get: () => BacktestStore) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const draft = get().draft
    if (draft) void api.put('/api/backtest/draft', draft).catch(() => undefined)
  }, 500)
}

/** Ramène la durée au maximum permis par la bougie du brouillon (sinon le lancement serait bloqué). */
function clampDays(o: BtStatus['options'], d: BtDraft): BtDraft {
  const max = o.max_days[d.timeframe]
  return max && Number(d.days) > max ? { ...d, days: String(Math.floor(max)) } : d
}

/** Brouillon conservé complété par les champs manquants ; le marché n'est gardé que s'il fait toujours partie des scénarios (sinon : aujourd'hui). */
function restoreDraft(o: BtStatus['options'], saved: BtDraft | null): BtDraft {
  const base = initialDraft(o)
  if (!saved) return base
  const keepEnd = o.scenarios.some((sc) => sc.end === saved.end)
  return clampDays(o, { ...base, ...saved, end: keepEnd ? saved.end : '' })
}

/** Brouillon -> corps JSON : nombres convertis ; vide = sans restriction (`null`) pour les champs facultatifs, sinon valeur du Bot IA conservée (champ omis). */
function toPayload(d: BtDraft) {
  const out: Record<string, unknown> = { ...d, timeframe: Number(d.timeframe), days: Number(d.days), max_calls: d.max_calls === '' ? null : Number(d.max_calls) }
  for (const k of BT_NUMERIC_KEYS) {
    if (d[k] !== '') out[k] = Number(d[k])
    else if (BT_OPTIONAL_KEYS.includes(k)) out[k] = null
    else delete out[k]
  }
  return out
}

/** Page Backtest IA : état du serveur (essai courant, historique), formulaire (enregistré côté serveur) et actions. */
export const useBacktestStore = create<BacktestStore>((set, get) => ({
  status: null,
  draft: null,
  viewing: null,

  refresh: async () => {
    try {
      const status = await api.get<BtStatus>('/api/backtest/status')
      if (get().draft) return set({ status })
      const saved = (await api.get<{ draft: BtDraft | null }>('/api/backtest/draft')).draft
      set((s) => ({ status, draft: s.draft ?? restoreDraft(status.options, saved) }))
    } catch {
      /* serveur injoignable */
    }
  },

  setField: (name, value) => {
    set((s) => {
      if (!s.draft) return s
      const next = { ...s.draft, [name]: value }
      return { draft: name === 'timeframe' && s.status ? clampDays(s.status.options, next) : next }   // changer de bougie ramène la durée au maximum permis
    })
    saveSoon(get)
  },

  toggleIn: (name, value) => {
    set((s) => {
      if (!s.draft) return s
      const cur = s.draft[name]
      return { draft: { ...s.draft, [name]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] } }
    })
    saveSoon(get)
  },

  applyPreset: (p) => {
    set((s) => {
      if (!s.draft || !s.status) return s
      const draft = { ...s.draft, ...presetPatch(p, (k) => k in s.draft!) } as BtDraft
      return { draft: clampDays(s.status.options, draft) }
    })
    saveSoon(get)
    toast.info(`Préréglage « ${p.label} » appliqué`)
  },

  start: async () => {
    const d = get().draft
    if (!d) return
    if (await runAction(() => api.post('/api/backtest/start', toPayload(d)), 'Backtest lancé', get().refresh)) set({ viewing: null })
  },

  enqueue: async (axes = []) => {
    const d = get().draft
    if (!d) return false
    return runAction(() => api.post('/api/backtest/queue', { base: toPayload(d), axes }), 'Ajouté à la file d’attente', get().refresh)
  },

  queueRun: async () => {
    await runAction(() => api.post('/api/backtest/queue/run'), 'File lancée : les essais s’enchaînent', get().refresh)
  },

  queueStop: async () => {
    await runAction(() => api.post('/api/backtest/queue/stop'), 'La file s’arrêtera après l’essai en cours', get().refresh)
  },

  queueClear: async () => {
    await runAction(() => api.del('/api/backtest/queue'), 'File vidée', get().refresh)
  },

  queueRemove: async (id) => {
    await runAction(() => api.del(`/api/backtest/queue/${id}`), undefined, get().refresh)
  },

  cancel: async () => {
    await runAction(() => api.post('/api/backtest/cancel'), 'Annulation demandée', get().refresh)
  },

  pause: async () => {
    await runAction(() => api.post('/api/backtest/pause'), 'Backtest en pause', get().refresh)
  },

  resume: async () => {
    await runAction(() => api.post('/api/backtest/resume'), 'Backtest repris', get().refresh)
  },

  open: async (id) => {
    try {
      set({ viewing: await api.get<BtRun>(`/api/backtest/${id}`) })
    } catch (e) {
      toast.error(errMsg(e))
    }
  },

  closeView: () => set({ viewing: null }),

  remove: async (id) => {
    await runAction(() => api.del(`/api/backtest/${id}`), 'Essai supprimé', get().refresh)
    if (get().viewing?.id === id) set({ viewing: null })
  },
}))
