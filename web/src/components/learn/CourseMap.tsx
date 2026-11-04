import { Check } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { LESSONS, MODULES } from '@/lib/learn/lessons'
import { METHODS } from '@/lib/learn/methods'
import { isValidated, progress, TRIAL_METHODS } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'
import css from './Learn.module.css'

/** Le « passeport » : la todo-list globale des 6 épreuves (une par méthode). Objectif : toutes les valider. */
export function Passport({ compact = false }: { compact?: boolean }) {
  const trials = useLearnStore((s) => s.trials)
  const p = progress(trials)
  return (
    <div>
      <div className={css.bar}><i style={{ width: `${p.percent}%` }} /></div>
      <div className="small" style={{ margin: '6px 0 8px' }}>
        <b className={p.complete ? 't-ok' : ''}>{p.done} / {p.total} méthodes validées</b>
      </div>
      <ul className={css.todo}>
        {TRIAL_METHODS.map((m) => {
          const rec = trials[m]
          const ok = isValidated(rec)
          const lesson = LESSONS.find((l) => l.method === m)
          return (
            <li key={m} className={ok ? css.done : ''}>
              <span className={css.box}>{ok && <Check className="ic m0" strokeWidth={3} />}</span>
              <span style={{ flex: 1 }}>
                <Link to={`/learn/${lesson?.id}`} className={css.lbl} style={{ color: 'inherit', textDecoration: ok ? 'line-through' : 'none' }}>{METHODS[m].name}</Link>
                {!compact && !ok && (
                  <div className={css.hlp}>
                    {rec?.quiz ? '✔ quiz' : '○ quiz'} · {rec?.trade ? '✔ trade modèle' : '○ trade modèle'}
                    {rec?.attempts ? ` · ${rec.attempts} essai(s)` : ''}
                  </div>
                )}
                {!compact && ok && <div className={css.hlp}>validée le {rec?.validatedAt}{rec?.bestPct != null ? ` · meilleur résultat ${rec.bestPct >= 0 ? '+' : ''}${rec.bestPct.toFixed(1)} %` : ''}</div>}
              </span>
            </li>
          )
        })}
      </ul>
      {p.complete && <p className="t-ok" style={{ marginTop: 8 }}>🎉 Bravo : tu as utilisé les 6 méthodes !</p>}
    </div>
  )
}

/** Barre latérale du cours : passeport + liste des leçons par module. */
export function CourseMap() {
  const { id } = useParams()
  const done = useLearnStore((s) => s.lessonsDone)
  return (
    <div className="col">
      <Card title="Passeport des méthodes" icon={Check}>
        <div className="hint" style={{ marginTop: 0 }}>Ta mission : valider les 6 épreuves, une par méthode.</div>
        <Passport compact />
      </Card>
      <Card title="Le cours" icon={Check}>
        {MODULES.map((m) => (
          <div key={m.id}>
            <div className={css.modTitle}>{m.title}</div>
            {LESSONS.filter((l) => l.module === m.id).map((l) => (
              <Link key={l.id} to={`/learn/${l.id}`} className={`${css.lessonLink} ${id === l.id ? css.active : ''}`}>
                <span className={`${css.dot} ${done[l.id] ? css.ok : ''}`}>{done[l.id] && <Check className="ic m0" strokeWidth={3} />}</span>
                <span>{l.title}</span>
                <span className={css.minutes}>{l.minutes} min</span>
              </Link>
            ))}
          </div>
        ))}
      </Card>
    </div>
  )
}
