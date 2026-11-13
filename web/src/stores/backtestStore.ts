import { create } from 'zustand'
import { api, errMsg } from '@/lib/api'
import { BT_NUMERIC_KEYS, BT_OPTIONAL_KEYS, type BtNumericKey } from '@/lib/backtest'
import type { Aggressiveness, BtRun, BtStatus } from '@/lib/types'
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
  notes: string
  max_calls: string
}

interface BacktestStore {
  status: BtStatus | null
  draft: BtDraft | null
  /** Essai gardé ouvert depuis l'historique ; null = on suit l'essai courant. */
  viewing: BtRun | null

  refresh: () => Promise<void>
  setField: <K extends keyof BtDraft>(name: K, value: BtDraft[K]) => void
  toggleIn: (name: 'pairs' | 'strategies', value: string) => void
  start: () => Promise<void>
  cancel: () => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  open: (id: string) => Promise<void>
  /** Revient à l'essai courant. */
  closeView: () => void
  remove: (id: string) => Promise<void>
}

/** Valeurs de départ du formulaire : réglages du Bot IA, durée de 2 semaines (ou le maximum si la bougie ne le permet pas). */
function initialDraft(o: BtStatus['options']): BtDraft {
  const d = o.defaults
  const max = o.max_days[String(d.timeframe)] ?? 14
  const numbers = Object.fromEntries(BT_NUMERIC_KEYS.map((k) => [k, d[k] == null ? '' : String(d[k])])) as Record<BtNumericKey, string>
  return {
    ...numbers, provider: d.provider, model: d.model, pairs: [...d.pairs], strategies: [...d.strategies], timeframe: String(d.timeframe),
    days: String(Math.min(14, max)), aggressiveness: d.aggressiveness, allow_short: d.allow_short, notes: d.notes, max_calls: '',
  }
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

/** Page Backtest IA : état du serveur (essai courant, historique), formulaire et actions. */
export const useBacktestStore = create<BacktestStore>((set, get) => ({
  status: null,
  draft: null,
  viewing: null,

  refresh: async () => {
    try {
      const status = await api.get<BtStatus>('/api/backtest/status')
      set((s) => (s.draft ? { status } : { status, draft: initialDraft(status.options) }))
    } catch {
      /* serveur injoignable */
    }
  },

  setField: (name, value) => set((s) => (s.draft ? { draft: { ...s.draft, [name]: value } } : s)),

  toggleIn: (name, value) =>
    set((s) => {
      if (!s.draft) return s
      const cur = s.draft[name]
      return { draft: { ...s.draft, [name]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] } }
    }),

  start: async () => {
    const d = get().draft
    if (!d) return
    if (await runAction(() => api.post('/api/backtest/start', toPayload(d)), 'Backtest lancé', get().refresh)) set({ viewing: null })
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
