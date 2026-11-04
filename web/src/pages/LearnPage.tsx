import { GraduationCap, ListTree } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChapterList } from '@/components/learn/ChapterList'
import css from '@/components/learn/Learn.module.css'
import { Passport } from '@/components/learn/Passport'
import { Tunnel } from '@/components/learn/Tunnel'
import { Header, Kpi } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { LESSON_BY_ID, LESSONS } from '@/lib/learn/lessons'
import { progress } from '@/lib/learn/trials'
import { buildSteps, stepIndex } from '@/lib/learn/tunnel'
import { useLearnStore } from '@/stores/learnStore'

/** Page d'accueil du tutoriel : le pitch, le sommaire des chapitres et le passeport. */
function Welcome() {
  const done = useLearnStore((s) => s.lessonsDone)
  const first = LESSONS.find((l) => !done[l.id]) ?? LESSONS[0]
  const started = Object.keys(done).length > 0
  return (
    <div className={css.welcome}>
      <div className="col">
        <div className={css.hero}>
          <h2>Apprends à trader, sans risquer un centime</h2>
          <div className={css.prose}>
            <p>
              Ici, tout est <b>simulé</b> : de l&apos;argent fictif, aucun compte, aucun ordre envoyé nulle part. On t&apos;explique chaque mot technique,
              <b> une étape à la fois</b>, comme si tu n&apos;avais jamais ouvert un graphique.
            </p>
            <ol className={css.steps}>
              <li><b>Lis</b> un chapitre, étape par étape : les mots difficiles sont cliquables.</li>
              <li><b>Réponds</b> à un petit quiz pour vérifier que c&apos;est clair.</li>
              <li><b>Rejoue le marché</b> : un vrai moment passé, bougie par bougie, sans la suite. À toi de décider.</li>
            </ol>
            <p><b>Ta mission :</b> valider les 6 méthodes de trading (une épreuve chacune).</p>
          </div>
          <div className="row">
            <Link className="btn" to={`/learn/${first.id}/1`}>{started ? 'Reprendre là où tu en étais' : 'Commencer le parcours'} →</Link>
            {started && <Link className="btn sec" to={`/learn/${LESSONS[0].id}/1`}>Reprendre depuis le début</Link>}
          </div>
        </div>
        <Card title="Tous les chapitres" icon={ListTree}>
          <ChapterList />
        </Card>
      </div>
      <div className="col">
        <Card title="Passeport des méthodes" icon={GraduationCap}>
          <div className="hint" style={{ marginTop: 0 }}>Ta mission : valider les 6 épreuves, une par méthode.</div>
          <Passport />
        </Card>
        <div className={`${css.callout} ${css.warn}`}>
          <strong>⚠ Honnêteté</strong>
          <span className={css.prose}>Trader est risqué et la majorité des débutants perd de l&apos;argent. Ce tutoriel enseigne des méthodes et de la discipline : il ne promet aucun gain et n&apos;est pas un conseil financier.</span>
        </div>
      </div>
    </div>
  )
}

/** Page du tutoriel : sommaire ou chapitre en tunnel selon l'URL. */
export function LearnPage() {
  const { id, step } = useParams()
  const trials = useLearnStore((s) => s.trials)
  const lessonsDone = useLearnStore((s) => s.lessonsDone)
  const error = useLearnStore((s) => s.error)
  const load = useLearnStore((s) => s.load)
  useEffect(() => { void load() }, [load])
  const p = progress(trials)
  const lesson = id ? LESSON_BY_ID[id] : undefined
  const steps = useMemo(() => (lesson ? buildSteps(lesson) : []), [lesson])

  return (
    <>
      <Header title="Apprendre le trading" icon={GraduationCap}>
        <Kpi bare label="Mode" tipRight={false} tip="Page 100 % simulation : aucun ordre n'est jamais envoyé, même si tu es en mode LIVE ailleurs.">
          <b className="t-ac">PAPER UNIQUEMENT</b>
        </Kpi>
        <Kpi label="Épreuves validées" tip="Une épreuve par méthode. Objectif : toutes les valider.">
          <b className={p.complete ? 't-ok' : ''}>{p.done} / {p.total}</b>
        </Kpi>
        <Kpi label="Leçons terminées" tip="Leçons dont le quiz est réussi.">
          <b>{LESSONS.filter((l) => lessonsDone[l.id]).length} / {LESSONS.length}</b>
        </Kpi>
      </Header>
      {error && <div className="warn danger" style={{ maxWidth: 1600, margin: '16px auto 0' }}>{error}</div>}
      <div style={{ paddingTop: 16 }}>
        {lesson ? <Tunnel key={lesson.id} lesson={lesson} steps={steps} index={stepIndex(step, steps.length)} /> : <Welcome />}
      </div>
    </>
  )
}
