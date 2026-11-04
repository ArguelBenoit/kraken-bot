import { create } from 'zustand'
import { api } from '@/lib/api'
import { AI_NUMERIC_KEYS, type AiNumericKey } from '@/lib/aiForm'
import type { AiConfig, AiStatus, Mode, Notice } from '@/lib/types'
import { runAction } from './runAction'

/** Brouillon du formulaire : les champs numériques restent du texte tant que l'utilisateur tape. */
type AiDraft = Omit<AiConfig, 'mode' | AiNumericKey> & Record<AiNumericKey, number | string>

/** Réglages enregistrés -> brouillon du formulaire. */
const toDraft = (c: AiConfig): AiDraft => {
  const { mode: _mode, ...rest } = c
  void _mode
  return { ...rest, strategies: [...c.strategies], pairs: [...c.pairs] }
}

/** Brouillon -> corps JSON : champs numériques convertis, listes inchangées. */
const toAiPayload = (d: AiDraft) => {
  const out: Record<string, unknown> = { ...d }
  for (const k of AI_NUMERIC_KEYS) out[k] = Number(d[k])
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
}

/** État de la page Bot IA : statut du serveur, brouillon du formulaire et actions. */
export const useAiStore = create<AiStore>((set, get) => {
  const run = (fn: () => Promise<unknown>, okText?: string) => runAction(fn, okText, (notice) => set({ notice }), get().refresh)

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
  }
})
