/** Le cours : modules et leçons, agrégés depuis `content/`. Dans les textes : `[[id|texte]]` = mot du glossaire cliquable, `**gras**`. */
import { ADVANCED } from './content/advanced'
import { BASES } from './content/bases'
import { METHOD_LESSONS } from './content/methods'
import type { Lesson, ModuleId } from './lessonTypes'

export type { Block, Lesson, ModuleId, QuizQuestion } from './lessonTypes'

/** Les trois modules du cours, dans l'ordre. */
export const MODULES: { id: ModuleId; title: string; intro: string }[] = [
  { id: 'bases', title: '1 · Les bases', intro: `Comprendre ce qu'on fait, lire un graphique, et se protéger. Rien de compliqué.` },
  { id: 'methodes', title: '2 · Les 6 méthodes (épreuves)', intro: `Chaque méthode est une façon de décider « quand acheter, quand vendre ». Pour chacune : une leçon, un quiz, puis un trade d'entraînement. Objectif : les valider toutes.` },
  { id: 'avance', title: '3 · Pour aller plus loin', intro: `Éviter les pièges et garder les pieds sur terre.` },
]

/** Toutes les leçons, dans l'ordre du parcours. */
export const LESSONS: Lesson[] = [...BASES, ...METHOD_LESSONS, ...ADVANCED]

/** Accès à une leçon par son identifiant (utilisé par l'URL). */
export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]))
