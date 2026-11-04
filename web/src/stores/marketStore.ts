import { create } from 'zustand'
import { api } from '@/lib/api'
import type { ChartData, ScanRow } from '@/lib/types'

interface View {
  pair: string
  tf: number
}

interface MarketStore {
  tf: number
  rows: ScanRow[]
  info: string
  /** Paire/bougie demandées par l'utilisateur ; null = celles par défaut du serveur. */
  view: View | null
  chart: ChartData | null

  loadScan: () => Promise<void>
  loadChart: () => Promise<void>
  setTf: (tf: number) => void
  selectPair: (pair: string) => void
}

/** Tableau Marché et graphique de la page Trading : le sélecteur « Bougie » pilote les deux. */
export const useMarketStore = create<MarketStore>((set, get) => ({
  tf: 240,
  rows: [],
  info: '',
  view: null,
  chart: null,

  loadScan: async () => {
    set({ info: ' chargement…' })
    try {
      const rows = await api.get<ScanRow[]>(`/api/scan?tf=${get().tf}`)
      set({ rows, info: ` mis à jour ${new Date().toLocaleTimeString('fr-FR')}` })
    } catch (e) {
      set({ info: ` ${e instanceof Error ? e.message : 'erreur'}` })
    }
  },

  loadChart: async () => {
    const { view } = get()
    const q = view ? `?pair=${view.pair}&tf=${view.tf}` : ''
    try {
      set({ chart: await api.get<ChartData>(`/api/chart${q}`) })
    } catch {
      /* on garde le graphique précédent */
    }
  },

  setTf: (tf) => {
    set({ tf })
    void get().loadScan()
    const chart = get().chart
    if (chart) {
      set({ view: { pair: chart.pair, tf } })
      void get().loadChart()
    }
  },

  selectPair: (pair) => {
    set({ view: { pair, tf: get().tf } })
    void get().loadChart()
  },
}))
