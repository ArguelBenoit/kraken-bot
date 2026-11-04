import { BookOpen, ListChecks, MessageCircleQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { LESSONS, type Lesson } from '@/lib/learn/lessons'
import { useLearnStore } from '@/stores/learnStore'
import { Checklist } from './Checklist'
import css from './Learn.module.css'
import { LessonBlocks } from './LessonBlocks'
import { PracticeArena } from './PracticeArena'
import { Quiz } from './Quiz'

export function LessonView({ lesson }: { lesson: Lesson }) {
  const done = useLearnStore((s) => !!s.lessonsDone[lesson.id])
  const trial = useLearnStore((s) => (lesson.method ? s.trials[lesson.method] : undefined))
  const passQuiz = useLearnStore((s) => s.passQuiz)
  const i = LESSONS.findIndex((l) => l.id === lesson.id)
  const prev = LESSONS[i - 1]
  const next = LESSONS[i + 1]

  return (
    <div className={css.main}>
      <Card title={lesson.title} icon={BookOpen} actions={<span className="t-mu small">{lesson.minutes} min</span>}>
        <LessonBlocks blocks={lesson.blocks} />
      </Card>

      {lesson.method && (
        <Card title="Ton épreuve : la liste de validation" icon={ListChecks}>
          <div className="hint" style={{ marginTop: 0 }}>Coche ces 4 cases pour valider cette méthode. Elles se cochent toutes seules pendant l&apos;exercice.</div>
          <Checklist record={trial} steps={null} />
        </Card>
      )}

      <Card title="Vérifie ce que tu as compris" icon={MessageCircleQuestion}>
        <Quiz key={lesson.id} questions={lesson.quiz} passed={done} onPass={() => passQuiz(lesson.id, lesson.method)} />
      </Card>

      {lesson.practice && (
        <PracticeArena key={lesson.id} method={lesson.practice.method} pair={lesson.practice.pair} tf={lesson.practice.tf} instruction={lesson.practice.instruction} />
      )}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        {prev ? <Link className="btn sec" to={`/learn/${prev.id}`}>← {prev.title}</Link> : <span />}
        {next && <Link className="btn" to={`/learn/${next.id}`}>{next.title} →</Link>}
      </div>
    </div>
  )
}
