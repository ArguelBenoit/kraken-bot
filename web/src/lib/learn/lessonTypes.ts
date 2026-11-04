/** Types du contenu du cours. Dans les textes : `[[id|texte]]` = mot du glossaire cliquable, `**gras**`. Écrit pour un débutant complet. */
import type { MethodId } from './methods'

export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'steps'; items: string[] }
  | { t: 'callout'; tone: 'tip' | 'warn' | 'key'; title: string; text: string }
  | { t: 'example'; text: string }
  | { t: 'rules'; buy: string[]; sell: string[] }
  | { t: 'pros'; good: string[]; bad: string[] }
  | { t: 'widget'; id: 'explore' | 'risk' }

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  explain: string
}

export type ModuleId = 'bases' | 'methodes' | 'avance'

export interface Lesson {
  id: string
  module: ModuleId
  title: string
  summary: string
  minutes: number
  /** Leçon d'une méthode : son épreuve se valide dans l'exercice. */
  method?: MethodId
  blocks: Block[]
  quiz: QuizQuestion[]
  practice?: { method: MethodId | 'none'; pair: string; tf: number; instruction: string }
}
