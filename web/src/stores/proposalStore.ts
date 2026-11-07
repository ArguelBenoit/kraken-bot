import { create } from 'zustand'
import { api, errMsg, isMissingRoute } from '@/lib/api'
import type { ProposalSet } from '@/lib/types'
import { toast } from './uiStore'

interface ProposalStore {
  result: ProposalSet | null
  loading: boolean
  /** Demande au modèle des trades pour maintenant (aucun ordre n'est passé). */
  ask: () => Promise<void>
  dismiss: () => void
}

/** Propositions de trade du modèle : dernière réponse, chargement et erreur. Elles restent affichées tant qu'on ne les ferme pas. */
export const useProposalStore = create<ProposalStore>((set, get) => ({
  result: null,
  loading: false,

  ask: async () => {
    if (get().loading) return
    set({ loading: true })
    try {
      set({ result: await api.post<ProposalSet>('/api/manual/propose') })
    } catch (e) {
      toast.error(isMissingRoute(e) ? 'Le serveur Python tourne avec une ancienne version : arrête-le (Ctrl+C) puis relance ./run.sh.' : errMsg(e))
    } finally {
      set({ loading: false })
    }
  },

  dismiss: () => set({ result: null }),
}))
