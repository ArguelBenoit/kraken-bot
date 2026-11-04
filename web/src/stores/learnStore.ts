import { create } from 'zustand'
import { api, errMsg, isMissingRoute } from '@/lib/api'
import type { MethodId } from '@/lib/learn/methods'
import { emptyRecord, type TrialRecord } from '@/lib/learn/trials'

/** Ce qui est sauvegardé : `learn_state.json` côté serveur, comme les autres pages. */
interface Progress {
  /** Une épreuve par méthode. */
  trials: Partial<Record<MethodId, TrialRecord>>
  /** Leçons dont le quiz a été réussi. */
  lessonsDone: Record<string, boolean>
}

interface LearnStore extends Progress {
  loaded: boolean
  error: string

  load: () => Promise<void>
  passQuiz: (lessonId: string, method?: MethodId) => Promise<void>
  /** Trade modèle mené à bout (signal + stop + clôture). */
  completeTrade: (method: MethodId) => Promise<void>
  recordAttempt: (method: MethodId, resultPct: number) => Promise<void>
  reset: () => Promise<void>
}

const upd = (p: Progress, m: MethodId, patch: (r: TrialRecord) => TrialRecord): Progress => ({
  ...p,
  trials: { ...p.trials, [m]: patch(p.trials[m] ?? emptyRecord()) },
})

/** Date de validation : posée la première fois que quiz ET trade sont acquis. */
const stamp = (r: TrialRecord): TrialRecord =>
  r.quiz && r.trade && !r.validatedAt ? { ...r, validatedAt: new Date().toLocaleDateString('fr-FR') } : r

/** Message affiché quand l'enregistrement de la progression échoue. */
const failure = (what: string, e: unknown) =>
  isMissingRoute(e)
    ? `${what} : le serveur Python n'a pas la route de progression. Il tourne avec une ancienne version : arrête-le (Ctrl+C) et relance ./run.sh.`
    : `${what} : ${errMsg(e)}`

export const useLearnStore = create<LearnStore>((set, get) => {
  /** Applique tout de suite le changement à l'écran, puis l'enregistre sur le serveur. */
  const mutate = async (fn: (p: Progress) => Progress) => {
    if (!get().loaded) await get().load() // jamais écraser la sauvegarde avant de l'avoir lue
    const next = fn({ trials: get().trials, lessonsDone: get().lessonsDone })
    set(next)
    try {
      set({ ...(await api.put<Progress>('/api/learn/progress', next)), error: '' })
    } catch (e) {
      set({ error: failure('Progression non enregistrée', e) })
    }
  }

  return {
    trials: {},
    lessonsDone: {},
    loaded: false,
    error: '',

    load: async () => {
      try {
        set({ ...(await api.get<Progress>('/api/learn/progress')), loaded: true, error: '' })
      } catch (e) {
        set({ error: failure('Progression illisible', e) })
      }
    },

    passQuiz: (lessonId, method) =>
      mutate((p) => {
        const next = { ...p, lessonsDone: { ...p.lessonsDone, [lessonId]: true } }
        return method ? upd(next, method, (r) => stamp({ ...r, quiz: true })) : next
      }),

    completeTrade: (method) => mutate((p) => upd(p, method, (r) => stamp({ ...r, trade: true }))),

    recordAttempt: (method, resultPct) =>
      mutate((p) => upd(p, method, (r) => ({ ...r, attempts: r.attempts + 1, bestPct: r.bestPct == null ? resultPct : Math.max(r.bestPct, resultPct) }))),

    reset: async () => {
      try {
        set({ ...(await api.post<Progress>('/api/learn/reset')), loaded: true, error: '' })
      } catch (e) {
        set({ error: failure('Réinitialisation impossible', e) })
      }
    },
  }
})
