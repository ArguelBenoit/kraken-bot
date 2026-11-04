import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'
import type { Ticket } from '@/lib/ticket'
import type { ManualConfig, ManualStatus, Mode } from '@/lib/types'
import { runAction } from './runAction'

const DEFAULT_TICKET: Ticket = { side: 'long', leverage: '2', pair: 'XBTUSDC', size: '100', type: 'market', limit: '', sl: '2', tp: '4', trail: '0' }

interface ManualStore {
  status: ManualStatus | null
  ticket: Ticket

  refresh: () => Promise<void>
  setTicket: (patch: Partial<Ticket>) => void
  submit: (live: boolean) => Promise<boolean>
  closePosition: (id: string, fraction: number, live: boolean) => Promise<void>
  adjust: (id: string, sl: number, tp: number, trail: number) => Promise<boolean>
  cancelPending: (id: string) => Promise<void>
  setMode: (mode: Mode) => Promise<void>
  saveConfig: (c: Partial<ManualConfig>) => Promise<boolean>
  reset: () => Promise<void>
}

/** État de la page Trading : portefeuille du serveur, ticket d'ordre (conservé dans le navigateur) et actions. */
export const useManualStore = create<ManualStore>()(
  persist(
    (set, get) => {
      const run = (fn: () => Promise<unknown>, okText?: string) => runAction(fn, okText, get().refresh)

      return {
        status: null,
        ticket: DEFAULT_TICKET,

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
            pair: t.pair, side: t.side, leverage: Number(t.leverage), size: Number(t.size), type: t.type, limit_price: Number(t.limit),
            sl_pct: Number(t.sl || 0), tp_pct: Number(t.tp || 0), trail_pct: Number(t.trail || 0), confirm: live || undefined,
          }
          return run(() => api.post('/api/manual/order', body), t.type === 'limit' ? 'Ordre limite placé' : t.side === 'short' ? 'Short ouvert' : 'Ordre exécuté')
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
          await run(() => api.post('/api/manual/config', { mode }), `Mode ${mode === 'live' ? 'LIVE' : 'PAPER'} activé`)
        },

        saveConfig: (c) => run(() => api.post('/api/manual/config', c), 'Réglages enregistrés'),

        reset: async () => {
          await run(() => api.post('/api/manual/reset'), 'Portefeuille paper réinitialisé')
        },
      }
    },
    {
      name: 'manual-ticket',
      partialize: (s) => ({ ticket: s.ticket }),
      // un ticket enregistré avant l'arrivée du short n'a ni sens ni levier : on complète avec les valeurs par défaut
      merge: (saved, current) => ({ ...current, ticket: { ...DEFAULT_TICKET, ...(saved as Partial<ManualStore>)?.ticket } }),
    },
  ),
)
