import { create } from 'zustand'
import { api } from '@/lib/api'
import { AI_NUMERIC_KEYS, type AiNumericKey } from '@/lib/aiForm'
import type { AiConfig, AiStatus, Mode } from '@/lib/types'
import { runAction } from './runAction'
import { toast } from './uiStore'

/** Message de succès de chaque commande du bot. */
const CONTROL_DONE = {
  start: 'Bot IA démarré',
  stop: 'Bot IA arrêté',
  analyze: 'Analyse lancée',
  liquidate: 'Toutes les positions ont été fermées',
  reset: 'Portefeuille du bot IA réinitialisé',
} as const

/** Brouillon du formulaire : les champs numériques restent du texte tant que l'utilisateur tape. */
type AiDraft = Omit<AiConfig, 'mode' | AiNumericKey> & Record<AiNumericKey, number | string>

/** Réglages enregistrés -> brouillon du formulaire. */
const toDraft = (c: AiConfig): AiDraft => {
  const { mode: _mode, ...rest } = c
  void _mode
  const numbers = Object.fromEntries(AI_NUMERIC_KEYS.map((k) => [k, c[k] ?? '']))      // null (illimité) -> champ vide
  return { ...rest, ...numbers, strategies: [...c.strategies], pairs: [...c.pairs] } as AiDraft
}

/** Brouillon -> corps JSON : champs numériques convertis (vide = null, c'est-à-dire sans restriction), listes inchangées. */
const toAiPayload = (d: AiDraft) => {
  const out: Record<string, unknown> = { ...d }
  for (const k of AI_NUMERIC_KEYS) out[k] = d[k] === '' ? null : Number(d[k])
  return out
}

interface AiStore {
  status: AiStatus | null
  draft: AiDraft | null

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
  const run = (fn: () => Promise<unknown>, okText?: string) => runAction(fn, okText, get().refresh)

  return {
    status: null,
    draft: null,

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
      if (cfg) {
        set({ draft: toDraft(cfg) })
        toast.info('Formulaire remis à la configuration enregistrée')
      }
    },

    save: () => {
      const d = get().draft
      return d ? run(() => api.post('/api/ai/config', toAiPayload(d)), 'Enregistré') : Promise.resolve(false)
    },

    setMode: async (mode) => {
      await run(() => api.post('/api/ai/config', { mode }), `Mode ${mode === 'live' ? 'LIVE' : 'PAPER'} activé`)
    },

    control: async (action) => {
      await run(() => api.post(`/api/ai/${action}`), CONTROL_DONE[action])
    },

    closePosition: async (id) => {
      await run(() => api.post(`/api/ai/close-${id}`), 'Position fermée')
    },
  }
})
