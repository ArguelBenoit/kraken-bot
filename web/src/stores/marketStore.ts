import { create } from 'zustand'
import { api } from '@/lib/api'
import { MARKET_TFS } from '@/lib/constants'
import type { ChartData, ScanRow } from '@/lib/types'

interface View {
  pair: string
  tf: number
}

interface MarketStore {
  tf: number
  rows: ScanRow[]
  info: string
  /** Paire/bougie demandées par l'utilisateur ; null = celles des réglages. */
  view: View | null
  chart: ChartData | null
  synced: boolean

  loadScan: () => Promise<void>
  loadChart: () => Promise<void>
  setTf: (tf: number) => void
  selectPair: (pair: string) => void
  /** Après un enregistrement : repart des réglages (paire + bougie). */
  followConfig: (timeframe: number) => void
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  tf: 240,
  rows: [],
  info: '',
  view: null,
  chart: null,
  synced: false,

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
      const chart = await api.get<ChartData>(`/api/chart${q}`)
      set({ chart })
      if (!get().synced) {
        // 1er affichage : le tableau suit la bougie du graphique (celle des réglages)
        set({ synced: true })
        if (MARKET_TFS.some((t) => t.value === chart.tf) && get().tf !== chart.tf) {
          set({ tf: chart.tf })
          void get().loadScan()
        }
      }
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

  followConfig: (timeframe) => {
    if (MARKET_TFS.some((t) => t.value === timeframe)) set({ tf: timeframe })
    set({ view: null, synced: true })
    void get().loadChart()
    void get().loadScan()
  },
}))
