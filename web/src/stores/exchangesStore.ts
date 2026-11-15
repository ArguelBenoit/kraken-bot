import { create } from 'zustand'
import { api, errMsg } from '@/lib/api'
import type { Exchange, ExchangeSummary } from '@/lib/types'
import { runAction } from './runAction'
import { toast } from './uiStore'

interface ExchangesStore {
  list: ExchangeSummary[] | null
  /** Échange choisi dans la liste ; null = le plus récent. */
  selectedId: string | null
  detail: Exchange | null

  refresh: () => Promise<void>
  select: (id: string) => Promise<void>
  clear: () => Promise<void>
}

/** Page « Échanges IA » : liste des appels aux modèles et détail (demande, réponse) de celui qui est ouvert. */
export const useExchangesStore = create<ExchangesStore>((set, get) => {
  const load = async (id: string) => {
    try {
      set({ detail: await api.get<Exchange>(`/api/exchanges/${id}`) })
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  return {
    list: null,
    selectedId: null,
    detail: null,

    refresh: async () => {
      try {
        const { exchanges } = await api.get<{ exchanges: ExchangeSummary[] }>('/api/exchanges')
        const id = get().selectedId ?? exchanges[0]?.id
        const known = exchanges.find((x) => x.id === id)
        set({ list: exchanges, ...(known ? {} : { selectedId: null, detail: null }) })
        const { detail } = get()
        if (known && (!detail || detail.id !== id || detail.status === 'pending')) await load(known.id)
      } catch {
        /* serveur injoignable */
      }
    },

    select: async (id) => {
      set({ selectedId: id })
      await load(id)
    },

    clear: async () => {
      if (await runAction(() => api.del('/api/exchanges'), 'Journal vidé', get().refresh)) set({ selectedId: null, detail: null })
    },
  }
})
