import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LESSONS, MODULES } from '@/lib/learn/lessons'
import { isValidated } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'
import css from './Learn.module.css'

/** Table des matières : tous les chapitres par module, avec leur état. Cliquer ouvre le chapitre à sa première étape. */
export function ChapterList({ current, onPick }: { current?: string; onPick?: () => void }) {
  const done = useLearnStore((s) => s.lessonsDone)
  const trials = useLearnStore((s) => s.trials)
  return (
    <div>
      {MODULES.map((m) => (
        <div key={m.id}>
          <div className={css.modTitle}>{m.title}</div>
          {LESSONS.filter((l) => l.module === m.id).map((l) => {
            const validated = l.method ? isValidated(trials[l.method]) : false
            return (
              <Link key={l.id} to={`/learn/${l.id}/1`} onClick={onPick} className={`${css.lessonLink} ${current === l.id ? css.active : ''}`}>
                <span className={`${css.dot} ${done[l.id] ? css.ok : ''}`}>{done[l.id] && <Check className="ic m0" strokeWidth={3} />}</span>
                <span>{l.title}</span>
                {validated && <span className="t-ok small">épreuve ✔</span>}
                <span className={css.minutes}>{l.minutes} min</span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
