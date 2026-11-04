import type { Block, Lesson } from './lessons'

/** Une leçon est présentée en « tunnel » : une étape à la fois (cours découpé par intertitres, puis quiz, épreuve, bilan). */
export type Step =
  | { kind: 'content'; title: string; blocks: Block[]; /** Étape qui explique l'épreuve : on y affiche la liste de validation. */ trial?: boolean }
  | { kind: 'quiz'; title: string }
  | { kind: 'practice'; title: string }
  | { kind: 'recap'; title: string }

/**
 * Découpe une leçon en étapes SANS perdre de contenu : chaque intertitre ouvre une nouvelle étape, tous les blocs sont conservés dans l'ordre.
 * Une introduction d'un seul bloc est fusionnée avec l'étape suivante (sinon l'écran serait presque vide).
 */
export function buildSteps(lesson: Lesson): Step[] {
  const sections: { title: string; blocks: Block[] }[] = []
  let cur: { title: string; blocks: Block[] } = { title: 'Introduction', blocks: [] }
  for (const b of lesson.blocks) {
    if (b.t === 'h') {
      if (cur.blocks.length) sections.push(cur)
      cur = { title: b.text, blocks: [] }
    } else cur.blocks.push(b)
  }
  if (cur.blocks.length) sections.push(cur)

  if (sections.length > 1 && sections[0].title === 'Introduction' && sections[0].blocks.length <= 1) {
    sections[1] = { ...sections[1], blocks: [...sections[0].blocks, ...sections[1].blocks] }
    sections.shift()
  }

  const steps: Step[] = sections.map((s) => ({ kind: 'content', title: s.title, blocks: s.blocks, trial: !!lesson.method && /épreuve/i.test(s.title) }))
  steps.push({ kind: 'quiz', title: 'Quiz' })
  if (lesson.practice) steps.push({ kind: 'practice', title: lesson.method ? 'Épreuve' : 'Exercice' })
  steps.push({ kind: 'recap', title: 'Bilan' })
  return steps
}

/** Numéro d'étape de l'URL (1 = première) → indice borné. */
export const stepIndex = (raw: string | undefined, count: number): number => {
  const n = Number.parseInt(raw ?? '1', 10)
  return Math.min(Math.max(Number.isNaN(n) ? 1 : n, 1), Math.max(count, 1)) - 1
}
