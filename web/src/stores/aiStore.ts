import { create } from 'zustand'
import { api, errMsg } from '@/lib/api'
import type { AiConfig, AiStatus, Mode } from '@/lib/types'

export type AiDraft = Omit<AiConfig, 'mode'>
export interface Notice {
  kind: 'error' | 'ok'
  text: string
}

const toDraft = (c: AiConfig): AiDraft => {
  const { mode: _mode, ...rest } = c
  void _mode
  return { ...rest, strategies: [...c.strategies], pairs: [...c.pairs] }
}

/** Valeurs de formulaire (texte) -> corps JSON. Les listes restent des listes. */
const NUMERIC: (keyof AiDraft)[] = [
  'timeframe', 'interval_min', 'check_every', 'max_positions', 'order_size', 'budget', 'max_exposure_pct',
  'max_daily_loss_pct', 'max_calls_per_day', 'fee_pct', 'price_in', 'price_out', 'credit_base',
]
export const toAiPayload = (d: AiDraft) => {
  const out: Record<string, unknown> = { ...d }
  for (const k of NUMERIC) out[k] = Number(d[k])
  return out
}

interface AiStore {
  status: AiStatus | null
  draft: AiDraft | null
  notice: Notice | null

  refresh: () => Promise<void>
  setField: <K extends keyof AiDraft>(name: K, value: AiDraft[K]) => void
  toggleIn: (name: 'strategies' | 'pairs', value: string) => void
  restore: () => void
  save: () => Promise<boolean>
  setMode: (mode: Mode) => Promise<void>
  control: (action: 'start' | 'stop' | 'analyze' | 'liquidate' | 'reset') => Promise<void>
  closePosition: (id: string) => Promise<void>
  notify: (n: Notice | null) => void
}

export const useAiStore = create<AiStore>((set, get) => {
  const run = async (fn: () => Promise<unknown>, okText?: string): Promise<boolean> => {
    try {
      await fn()
      set({ notice: okText ? { kind: 'ok', text: okText } : null })
      return true
    } catch (e) {
      set({ notice: { kind: 'error', text: errMsg(e) } })
      return false
    } finally {
      await get().refresh()
    }
  }

  return {
    status: null,
    draft: null,
    notice: null,

    refresh: async () => {
      try {
        const status = await api.get<AiStatus>('/api/ai/status')
        set((s) => (s.draft ? { status } : { status, draft: toDraft(status.config) }))
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

    restore: () => {
      const cfg = get().status?.config
      if (cfg) set({ draft: toDraft(cfg), notice: { kind: 'ok', text: 'Formulaire remis à la configuration enregistrée' } })
    },

    save: () => {
      const d = get().draft
      return d ? run(() => api.post('/api/ai/config', toAiPayload(d)), 'Enregistré') : Promise.resolve(false)
    },

    setMode: async (mode) => {
      const ok = await run(() => api.post('/api/ai/config', { mode }))
      if (!ok) alert(get().notice?.text)
    },

    control: async (action) => {
      const ok = await run(() => api.post(`/api/ai/${action}`))
      if (!ok) alert(get().notice?.text)
    },

    closePosition: async (id) => {
      const ok = await run(() => api.post(`/api/ai/close-${id}`))
      if (!ok) alert(get().notice?.text)
    },

    notify: (notice) => set({ notice }),
  }
})
