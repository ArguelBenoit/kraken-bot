import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Activity } from '@/lib/types'

interface ActivityStore {
  activity: Activity | null
  refresh: () => Promise<void>
}

/** État léger des trois bots (tourne ? positions ?), lu en continu pour les pastilles du menu, quelle que soit la page. */
export const useActivityStore = create<ActivityStore>((set) => ({
  activity: null,
  refresh: async () => {
    try {
      set({ activity: await api.get<Activity>('/api/activity') })
    } catch {
      /* serveur injoignable ou ancienne version : pas de pastilles */
    }
  },
}))
