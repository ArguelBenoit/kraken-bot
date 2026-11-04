import { GraduationCap } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CourseMap, Passport } from '@/components/learn/CourseMap'
import css from '@/components/learn/Learn.module.css'
import { LessonView } from '@/components/learn/LessonView'
import { Header, Kpi } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LESSON_BY_ID, LESSONS } from '@/lib/learn/lessons'
import { progress } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'

function Welcome() {
  const done = useLearnStore((s) => s.lessonsDone)
  const first = LESSONS.find((l) => !done[l.id]) ?? LESSONS[0]
  const reset = useLearnStore((s) => s.reset)
  return (
    <div className={css.main}>
      <div className={css.hero}>
        <h2>Apprends à trader, sans risquer un centime</h2>
        <div className={css.prose}>
          <p>
            Ici, tout est <b>simulé</b> : de l&apos;argent fictif, aucun compte, aucun ordre envoyé nulle part. Tu peux te tromper autant que tu veux.
            On t&apos;explique chaque mot technique, pas à pas, comme si tu n&apos;avais jamais ouvert un graphique.
          </p>
          <ol className={css.steps}>
            <li><b>Lis</b> une leçon courte : les mots difficiles sont cliquables et expliqués.</li>
            <li><b>Réponds</b> à un petit quiz pour vérifier que c&apos;est clair.</li>
            <li><b>Rejoue le marché</b> : on te montre un vrai moment passé, bougie par bougie, sans la suite. À toi de décider.</li>
          </ol>
          <p><b>Ta mission :</b> utiliser les 6 méthodes de trading. Chacune est une <b>épreuve</b> avec sa liste de validation à cocher. Quand les 6 sont validées, tu as fait le tour.</p>
        </div>
        <div className="row"><Link className="btn" to={`/learn/${first.id}`}>{Object.keys(done).length ? 'Continuer le parcours' : 'Commencer le parcours'} →</Link></div>
      </div>
      <Card title="Passeport des méthodes" icon={GraduationCap}>
        <Passport />
        {Object.keys(done).length > 0 && (
          <div className="row">
            <Button variant="sec" size="xs" onClick={() => window.confirm('Effacer toute ta progression (quiz et épreuves validées) ?') && void reset()}>Recommencer à zéro</Button>
          </div>
        )}
      </Card>
      <div className={css.callout + ' ' + css.warn}>
        <strong>⚠ Honnêteté</strong>
        <span className={css.prose}>Trader est risqué et la majorité des débutants perd de l&apos;argent. Ce tutoriel enseigne des méthodes et de la discipline : il ne promet aucun gain et n&apos;est pas un conseil financier.</span>
      </div>
    </div>
  )
}

export function LearnPage() {
  const { id } = useParams()
  const trials = useLearnStore((s) => s.trials)
  const lessonsDone = useLearnStore((s) => s.lessonsDone)
  const error = useLearnStore((s) => s.error)
  const load = useLearnStore((s) => s.load)
  useEffect(() => { void load() }, [load])
  const p = progress(trials)
  const lesson = id ? LESSON_BY_ID[id] : undefined

  return (
    <>
      <Header title="Apprendre le trading" icon={GraduationCap}>
        <Kpi label="Mode" tipRight={false} tip="Page 100 % simulation : aucun ordre n'est jamais envoyé, même si tu es en mode LIVE ailleurs.">
          <b className="t-ac">PAPER UNIQUEMENT</b>
        </Kpi>
        <Kpi label="Épreuves validées" tip="Une épreuve par méthode. Objectif : toutes les valider.">
          <b className={p.complete ? 't-ok' : ''}>{p.done} / {p.total}</b>
        </Kpi>
        <Kpi label="Leçons terminées" tip="Leçons dont le quiz est réussi.">
          <b>{LESSONS.filter((l) => lessonsDone[l.id]).length} / {LESSONS.length}</b>
        </Kpi>
      </Header>
      {error && <div className="warn danger" style={{ maxWidth: 1600, margin: '0 auto 12px' }}>{error}</div>}
      <div className={css.page}>
        <div className={css.map}><CourseMap /></div>
        {lesson ? <LessonView key={lesson.id} lesson={lesson} /> : <Welcome />}
      </div>
    </>
  )
}
