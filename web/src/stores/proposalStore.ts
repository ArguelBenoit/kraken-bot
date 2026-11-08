import { create } from 'zustand'
import { api, errMsg, isMissingRoute } from '@/lib/api'
import type { ProposalSet } from '@/lib/types'
import { toast } from './uiStore'

interface ProposalStore {
  result: ProposalSet | null
  loading: boolean
  /** Demande au modèle des trades pour maintenant (aucun ordre n'est passé). */
  ask: () => Promise<void>
  /** Interrompt l'analyse en cours (la connexion au modèle est coupée côté serveur). */
  cancel: () => Promise<void>
  /** Récupère la dernière proposition gardée par le serveur (après un rechargement ou une analyse lancée avant). */
  restore: () => Promise<void>
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
      const r = await api.post<ProposalSet | { cancelled: true }>('/api/manual/propose')
      if ('cancelled' in r) toast.info('Analyse annulée.')
      else set({ result: r })
    } catch (e) {
      toast.error(isMissingRoute(e) ? 'Le serveur Python tourne avec une ancienne version : arrête-le (Ctrl+C) puis relance ./run.sh.' : errMsg(e))
    } finally {
      set({ loading: false })
    }
  },

  cancel: async () => {
    try {
      await api.post('/api/manual/propose/cancel')
    } catch (e) {
      toast.error(isMissingRoute(e) ? 'Le serveur Python tourne avec une ancienne version : arrête-le (Ctrl+C) puis relance ./run.sh.' : errMsg(e))
    }
  },

  restore: async () => {
    try {
      const { result } = await api.get<{ result: ProposalSet | null }>('/api/manual/propose')
      if (result && !get().loading) set({ result })
    } catch { /* simple confort : la demande manuelle reste possible */ }
  },

  dismiss: () => {
    set({ result: null })
    void api.del('/api/manual/propose').catch(() => undefined)
  },
}))
