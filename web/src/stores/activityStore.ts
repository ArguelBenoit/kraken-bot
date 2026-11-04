import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Activity, Connections } from '@/lib/types'

interface ActivityStore {
  activity: Activity | null
  /** null tant que non chargé ; 'unavailable' si le serveur n'a pas la route (ancienne version). */
  connections: Connections | 'unavailable' | null
  refresh: () => Promise<void>
  loadConnections: () => Promise<void>
}

/** État léger des trois bots (tourne ? positions ?) pour les pastilles du menu, et variables d'environnement définies (bas du menu). */
export const useActivityStore = create<ActivityStore>((set) => ({
  activity: null,
  connections: null,
  refresh: async () => {
    try {
      set({ activity: await api.get<Activity>('/api/activity') })
    } catch {
      /* serveur injoignable ou ancienne version : pas de pastilles */
    }
  },
  loadConnections: async () => {
    try {
      set({ connections: await api.get<Connections>('/api/connections') })
    } catch {
      set({ connections: 'unavailable' })
    }
  },
}))
