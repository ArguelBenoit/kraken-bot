import type { MethodId } from './methods'
import type { Sim } from './sim'

/**
 * Épreuves : une par méthode. Objectif du parcours : les valider TOUTES.
 * Une épreuve est validée quand (1) le quiz de la leçon est réussi ET (2) un trade « modèle » a été mené à bout avec cette méthode :
 * acheté au moment du signal, protégé par un stop loss, puis clôturé.
 */
export const TRIAL_METHODS: MethodId[] = ['rsi', 'bollinger', 'trend', 'donchian', 'macd', 'momentum']

export interface TrialSteps {
  /** Au moins un achat fait au moment du signal de la méthode. */
  signalBuy: boolean
  /** … avec un stop loss posé. */
  stop: boolean
  /** … puis vendu (clôturé). */
  closed: boolean
}

/** État de la liste de validation pour l'exercice en cours (progressif : chaque étape suppose la précédente). */
export function trialSteps(sim: Sim): TrialSteps {
  let signalBuy = false
  let stop = false
  let closed = false
  let open: { followed: boolean; stop: boolean } | null = null
  for (const t of sim.trades) {
    if (t.side === 'BUY') {
      open = { followed: !!t.followedSignal, stop: !!t.withStop }
      if (open.followed) signalBuy = true
      if (open.followed && open.stop) stop = true
    } else if (open) {
      if (open.followed && open.stop) closed = true
      open = null
    }
  }
  return { signalBuy, stop, closed }
}

export interface TrialRecord {
  quiz: boolean
  /** Trade modèle mené à bout (signal + stop + clôture) au moins une fois. */
  trade: boolean
  attempts: number
  /** Meilleur résultat (%) d'un exercice sur cette méthode. */
  bestPct?: number
  validatedAt?: string
}

export const emptyRecord = (): TrialRecord => ({ quiz: false, trade: false, attempts: 0 })
export const isValidated = (r?: TrialRecord) => !!r && r.quiz && r.trade

export interface Checklist {
  id: 'quiz' | 'signal' | 'stop' | 'closed'
  label: string
  help: string
  done: boolean
}

/** La todo-list affichée pour une épreuve (état persistant + exercice en cours). */
export function checklist(rec: TrialRecord | undefined, steps: TrialSteps | null): Checklist[] {
  const r = rec ?? emptyRecord()
  return [
    { id: 'quiz', label: 'Réussir le quiz de la leçon', help: 'Réponds juste aux questions de l’étape « Quiz » de ce chapitre.', done: r.quiz },
    { id: 'signal', label: 'Acheter au moment du signal', help: 'Attends que la méthode donne un signal d’achat, puis achète.', done: r.trade || !!steps?.signalBuy },
    { id: 'stop', label: 'Protéger ce trade avec un stop loss', help: 'Avant d’acheter, choisis un « Stop loss » (ex. 3 %) : il limite la perte.', done: r.trade || !!steps?.stop },
    { id: 'closed', label: 'Clôturer le trade (vendre)', help: 'Vends toi-même, ou laisse le stop / l’objectif / le signal de sortie s’en charger.', done: r.trade || !!steps?.closed },
  ]
}

export function progress(records: Partial<Record<MethodId, TrialRecord>>) {
  const done = TRIAL_METHODS.filter((m) => isValidated(records[m])).length
  return { done, total: TRIAL_METHODS.length, percent: Math.round((done / TRIAL_METHODS.length) * 100), complete: done === TRIAL_METHODS.length }
}
