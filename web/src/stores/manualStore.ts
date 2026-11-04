import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, errMsg } from '@/lib/api'
import type { ManualConfig, ManualStatus, Mode } from '@/lib/types'

export interface Notice {
  kind: 'error' | 'ok'
  text: string
}

/** Formulaire d'ordre (valeurs en texte tant que l'utilisateur tape). */
export interface Ticket {
  pair: string
  size: string
  type: 'market' | 'limit'
  limit: string
  sl: string
  tp: string
  trail: string
}

const DEFAULT_TICKET: Ticket = { pair: 'XBTUSDC', size: '100', type: 'market', limit: '', sl: '2', tp: '4', trail: '0' }

interface ManualStore {
  status: ManualStatus | null
  ticket: Ticket
  notice: Notice | null

  refresh: () => Promise<void>
  setTicket: (patch: Partial<Ticket>) => void
  submit: (live: boolean) => Promise<boolean>
  closePosition: (id: string, fraction: number, live: boolean) => Promise<void>
  adjust: (id: string, sl: number, tp: number, trail: number) => Promise<boolean>
  cancelPending: (id: string) => Promise<void>
  setMode: (mode: Mode) => Promise<void>
  saveConfig: (c: Partial<ManualConfig>) => Promise<boolean>
  reset: () => Promise<void>
  notify: (n: Notice | null) => void
}

export const useManualStore = create<ManualStore>()(
  persist(
    (set, get) => {
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
        ticket: DEFAULT_TICKET,
        notice: null,

        refresh: async () => {
          try {
            const status = await api.get<ManualStatus>(`/api/manual/status?pair=${get().ticket.pair}`)
            set({ status })
          } catch {
            /* serveur injoignable */
          }
        },

        setTicket: (patch) => set((s) => ({ ticket: { ...s.ticket, ...patch } })),

        submit: (live) => {
          const t = get().ticket
          const body = {
            pair: t.pair, size: Number(t.size), type: t.type, limit_price: Number(t.limit),
            sl_pct: Number(t.sl || 0), tp_pct: Number(t.tp || 0), trail_pct: Number(t.trail || 0), confirm: live || undefined,
          }
          return run(() => api.post('/api/manual/order', body), t.type === 'limit' ? 'Ordre limite placé' : 'Ordre exécuté')
        },

        closePosition: async (id, fraction, live) => {
          await run(() => api.post(`/api/manual/positions/${id}/close`, { fraction, confirm: live || undefined }), 'Position fermée')
        },

        adjust: (id, sl, tp, trail) =>
          run(() => api.post(`/api/manual/positions/${id}/adjust`, { sl_pct: sl, tp_pct: tp, trail_pct: trail }), 'Stops mis à jour'),

        cancelPending: async (id) => {
          await run(() => api.del(`/api/manual/pending/${id}`), 'Ordre annulé')
        },

        setMode: async (mode) => {
          const ok = await run(() => api.post('/api/manual/config', { mode }))
          if (!ok) alert(get().notice?.text)
        },

        saveConfig: (c) => run(() => api.post('/api/manual/config', c), 'Réglages enregistrés'),

        reset: async () => {
          await run(() => api.post('/api/manual/reset'), 'Portefeuille paper réinitialisé')
        },

        notify: (notice) => set({ notice }),
      }
    },
    { name: 'manual-ticket', partialize: (s) => ({ ticket: s.ticket }) },
  ),
)
