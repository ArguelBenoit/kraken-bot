import { ArrowLeft, ArrowRight, BookOpen, Flag, MessageCircleQuestion } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LESSONS, type Lesson } from '@/lib/learn/lessons'
import { isValidated } from '@/lib/learn/trials'
import type { Step } from '@/lib/learn/tunnel'
import { useLearnStore } from '@/stores/learnStore'
import { Checklist } from './Checklist'
import css from './Learn.module.css'
import { LessonBlocks } from './LessonBlocks'
import { PracticeArena } from './PracticeArena'
import { Quiz } from './Quiz'
import { TunnelBar } from './TunnelBar'

interface Props {
  lesson: Lesson
  steps: Step[]
  index: number
}

/** Un chapitre en « tunnel » : une étape à l'écran, navigation précédent / suivant (flèches du clavier aussi). */
export function Tunnel({ lesson, steps, index }: Props) {
  const nav = useNavigate()
  const done = useLearnStore((s) => !!s.lessonsDone[lesson.id])
  const trial = useLearnStore((s) => (lesson.method ? s.trials[lesson.method] : undefined))
  const passQuiz = useLearnStore((s) => s.passQuiz)
  const step = steps[index]
  const i = LESSONS.findIndex((l) => l.id === lesson.id)
  const nextLesson = LESSONS[i + 1]

  const go = (k: number) => nav(`/learn/${lesson.id}/${k + 1}`)
  const last = index === steps.length - 1

  useEffect(() => {
    window.scrollTo({ top: 0 }) // une étape neuve s'ouvre toujours en haut de page
  }, [lesson.id, index])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' && index < steps.length - 1) go(index + 1)
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const quizIdx = steps.findIndex((s) => s.kind === 'quiz')

  return (
    <div className={css.tunnel}>
      <TunnelBar lesson={lesson} steps={steps} index={index} onGo={go} />

      <div className={css.stage}>
        {step.kind === 'content' && (
          <Card title={step.title} icon={BookOpen}>
            <div className={css.measure}>
              <LessonBlocks blocks={step.blocks} />
              {step.trial && (
                <div style={{ marginTop: 8 }}>
                  <div className="hint">Voici ta liste de validation : elle se coche toute seule pendant l&apos;exercice.</div>
                  <Checklist record={trial} steps={null} />
                </div>
              )}
            </div>
          </Card>
        )}

        {step.kind === 'quiz' && (
          <Card title="Vérifie ce que tu as compris" icon={MessageCircleQuestion}>
            <div className={css.measure}>
              <Quiz key={lesson.id} questions={lesson.quiz} passed={done} onPass={() => passQuiz(lesson.id, lesson.method)} />
            </div>
          </Card>
        )}

        {step.kind === 'practice' && lesson.practice && (
          <PracticeArena key={lesson.id} method={lesson.practice.method} pair={lesson.practice.pair} tf={lesson.practice.tf} instruction={lesson.practice.instruction} />
        )}

        {step.kind === 'recap' && (
          <Card title="Chapitre terminé" icon={Flag}>
            <div className={css.measure}>
            <div className={css.prose}>
              <p>
                {done ? <span className="t-ok">✔ Quiz réussi.</span> : <>Le quiz n&apos;est pas encore réussi. <Button size="xs" variant="sec" onClick={() => go(quizIdx)}>Aller au quiz</Button></>}
              </p>
              {lesson.method && (
                <>
                  <p>{isValidated(trial) ? <span className="t-ok">✔ Épreuve validée.</span> : `Épreuve : il te reste des cases à cocher${lesson.practice ? ' (étape « Épreuve »)' : ''}.`}</p>
                  <Checklist record={trial} steps={null} />
                </>
              )}
            </div>
            <div className="row">
              {nextLesson ? (
                <Link className="btn" to={`/learn/${nextLesson.id}/1`}>Chapitre suivant : {nextLesson.title} →</Link>
              ) : (
                <Link className="btn" to="/learn">Retour au sommaire</Link>
              )}
              <Button variant="sec" onClick={() => go(0)}>Refaire ce chapitre depuis le début</Button>
              <Link className="btn sec" to="/learn">Tous les chapitres</Link>
            </div>
            </div>
          </Card>
        )}

        <div className={css.footnav}>
          <Button variant="sec" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft className="ic mr" />Précédent</Button>
          {!last && <Button onClick={() => go(index + 1)}>{steps[index + 1].title === 'Quiz' ? 'Passer au quiz' : 'Suivant'}<ArrowRight className="ic" style={{ marginLeft: 6 }} /></Button>}
        </div>
        <div className="small t-mu" style={{ textAlign: 'center', marginTop: 8 }}>Astuce : les flèches ← → du clavier changent d&apos;étape.</div>
      </div>
    </div>
  )
}
