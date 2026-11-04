import { create } from 'zustand'
import { api, errMsg } from '@/lib/api'
import { pairLabel } from '@/lib/constants'
import { ALL_FIELDS, formValues, toPayload, type FormValues } from '@/lib/fields'
import type { BotConfig, BotStatus, Mode, Notice, Suggestion } from '@/lib/types'
import { runAction } from './runAction'

type Draft = FormValues
const toDraft = (c: BotConfig): Draft => Object.fromEntries(ALL_FIELDS.map((f) => [f.name, c[f.name]]))

interface BotStore {
  status: BotStatus | null
  draft: Draft
  filled: boolean
  notice: Notice | null
  /** Mode IA : dernière proposition de Claude (le formulaire est déjà rempli avec). */
  suggestion: Suggestion | null
  suggesting: boolean
  suggestError: string

  /** Demande à Claude le meilleur réglage du moment et pré-remplit le formulaire (n'enregistre rien). */
  askClaude: (lockPair: boolean) => Promise<void>
  dismissSuggestion: () => void
  refresh: () => Promise<void>
  setField: (name: keyof BotConfig, value: string | number) => void
  /** Pré-remplit le formulaire (sans enregistrer). */
  applyDraft: (values: Draft, notice?: Notice) => void
  restore: () => Promise<void>
  save: () => Promise<boolean>
  control: (action: 'start' | 'stop' | 'liquidate' | 'reset') => Promise<void>
  setMode: (mode: Mode) => Promise<void>
  tradeThis: (pair: string, tf: number) => void
}

/** État de la page du bot simple : statut du serveur, brouillon du formulaire, proposition de Claude et actions. */
export const useBotStore = create<BotStore>((set, get) => {
  const run = (fn: () => Promise<unknown>, okText?: string) => runAction(fn, okText, (notice) => set({ notice }), get().refresh)

  return {
    status: null,
    draft: {},
    filled: false,
    notice: null,
    suggestion: null,
    suggesting: false,
    suggestError: '',

    askClaude: async (lockPair) => {
      set({ suggesting: true, suggestError: '' })
      try {
        const r = await api.post<Suggestion>('/api/suggest', { lock_pair: lockPair })
        get().applyDraft(formValues(r.config), { kind: 'ok', text: 'Réglages proposés par Claude chargés dans le formulaire : vérifie, clique Enregistrer puis Démarrer.' })
        set({ suggestion: r })
      } catch (e) {
        set({ suggestError: errMsg(e) })
      } finally {
        set({ suggesting: false })
      }
    },

    dismissSuggestion: () => set({ suggestion: null, suggestError: '' }),

    refresh: async () => {
      try {
        const status = await api.get<BotStatus>('/api/status')
        set((s) => (s.filled ? { status } : { status, draft: toDraft(status.config), filled: true }))
      } catch {
        /* serveur injoignable : on garde l'affichage précédent */
      }
    },

    setField: (name, value) => set((s) => ({ draft: { ...s.draft, [name]: value } })),

    applyDraft: (values, notice) =>
      set((s) => ({ draft: { ...s.draft, ...values }, notice: notice ?? null })),

    restore: async () => {
      await get().refresh()
      const cfg = get().status?.config
      if (cfg) set({ draft: toDraft(cfg), notice: { kind: 'ok', text: 'Formulaire remis à la configuration enregistrée' } })
    },

    save: () => run(() => api.post('/api/config', toPayload(get().draft))),

    control: async (action) => {
      await run(() => api.post(`/api/${action}`))
    },

    setMode: async (mode) => {
      const ok = await run(() => api.post('/api/config', { mode }))
      if (!ok) alert(get().notice?.text)
    },

    tradeThis: (pair, tf) => {
      get().applyDraft({ pair, timeframe: tf }, {
        kind: 'ok', text: `Paire ${pairLabel(pair)} et bougie ${tf} min chargées dans le formulaire : règle le reste (ou demande à Claude), puis Enregistrer.`,
      })
    },
  }
})

