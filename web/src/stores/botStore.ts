import { create } from 'zustand'
import { api, errMsg } from '@/lib/api'
import { pairLabel } from '@/lib/constants'
import { ALL_FIELDS, toPayload } from '@/lib/fields'
import { PRESET_NAMES, presetFor, type PresetConfig } from '@/lib/presets'
import type { BotConfig, BotStatus, Mode } from '@/lib/types'

export type Draft = Partial<Record<keyof BotConfig, string | number>>
export interface Notice {
  kind: 'error' | 'ok'
  text: string
}

const toDraft = (c: BotConfig): Draft => Object.fromEntries(ALL_FIELDS.map((f) => [f.name, c[f.name]]))

interface BotStore {
  status: BotStatus | null
  draft: Draft
  filled: boolean
  notice: Notice | null

  refresh: () => Promise<void>
  setField: (name: keyof BotConfig, value: string | number) => void
  /** Pré-remplit le formulaire (sans enregistrer). */
  applyDraft: (values: Draft, notice?: Notice) => void
  restore: () => Promise<void>
  save: () => Promise<boolean>
  control: (action: 'start' | 'stop' | 'liquidate' | 'reset') => Promise<void>
  setMode: (mode: Mode) => Promise<void>
  pin: (name: string) => Promise<boolean>
  removePreset: (id: string, name: string) => Promise<void>
  tradeThis: (pair: string, tf: number) => void
  notify: (n: Notice | null) => void
}

export const useBotStore = create<BotStore>((set, get) => {
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
    draft: {},
    filled: false,
    notice: null,

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

    pin: (name) => run(() => api.post('/api/presets', { name }), `« ${name} » épinglée`),

    removePreset: async (id, name) => {
      await run(() => api.del(`/api/presets/${id}`), `Config « ${name} » supprimée`)
    },

    tradeThis: (pair, tf) => {
      const strategy = String(get().draft.strategy ?? get().status?.config.strategy ?? 'rsi')
      const found = presetFor(pair, strategy)
      const base: Draft = { pair, timeframe: tf }
      if (found) {
        const [id, preset] = found
        get().applyDraft({ ...base, ...(preset as PresetConfig as Draft) }, {
          kind: 'ok', text: `Preset « ${PRESET_NAMES[id]} » chargé : vérifie puis clique Enregistrer`,
        })
      } else {
        get().applyDraft(base, {
          kind: 'ok',
          text: `Aucun preset ${strategy === 'trend' ? 'EMA' : 'RSI'} pour ${pairLabel(pair)} : seule la paire et la bougie sont changées, règle le reste puis Enregistrer`,
        })
      }
    },

    notify: (notice) => set({ notice }),
  }
})

