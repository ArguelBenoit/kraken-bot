import { Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { QuizQuestion } from '@/lib/learn/lessons'
import css from './Learn.module.css'

interface Props {
  questions: QuizQuestion[]
  passed: boolean
  onPass: () => void
}

/** Quiz de fin de leçon : on peut recommencer à volonté ; toutes les réponses justes valident l'étape. */
export function Quiz({ questions, passed, onPass }: Props) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null))
  const [checked, setChecked] = useState(false)
  const allRight = picked.every((p, i) => p === questions[i].answer)

  const check = () => {
    setChecked(true)
    if (allRight) onPass()
  }
  const retry = () => {
    setPicked(questions.map(() => null))
    setChecked(false)
  }

  return (
    <div>
      {questions.map((q, i) => (
        <div className={css.q} key={i}>
          <p>{i + 1}. {q.q}</p>
          {q.options.map((o, j) => {
            const sel = picked[i] === j
            const cls = checked ? (j === q.answer ? css.right : sel ? css.wrong : '') : sel ? css.sel : ''
            return (
              <label key={j} className={`${css.opt} ${cls}`}>
                <input type="radio" name={`q${i}`} checked={sel} disabled={checked} onChange={() => setPicked(picked.map((p, k) => (k === i ? j : p)))} />
                {o}
              </label>
            )
          })}
          {checked && <div className={css.explain}>{picked[i] === q.answer ? '✔ Bien vu. ' : '✘ Pas tout à fait. '}{q.explain}</div>}
        </div>
      ))}
      <div className="row">
        {!checked ? (
          <Button onClick={check} disabled={picked.some((p) => p == null)}>Vérifier mes réponses</Button>
        ) : (
          !allRight && <Button variant="sec" onClick={retry}>Réessayer</Button>
        )}
        {(passed || (checked && allRight)) && <span className="t-ok"><Check className="ic" /> Quiz réussi</span>}
      </div>
    </div>
  )
}
