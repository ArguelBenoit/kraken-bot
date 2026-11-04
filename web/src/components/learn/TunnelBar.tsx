import { GraduationCap, ListTree, RotateCcw } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useDismiss } from '@/hooks/useDismiss'
import { LESSONS, type Lesson } from '@/lib/learn/lessons'
import { progress } from '@/lib/learn/trials'
import type { Step } from '@/lib/learn/tunnel'
import { useLearnStore } from '@/stores/learnStore'
import { ChapterList } from './ChapterList'
import css from './Learn.module.css'
import { Passport } from './Passport'

/** Bouton + panneau déroulant, fermé par clic extérieur ou Échap. */
function Drop({ label, icon, side, children }: { label: ReactNode; icon: ReactNode; side: 'left' | 'right'; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)
  useDismiss(ref, close, open)
  return (
    <div className={css.drop} ref={ref}>
      <Button variant="sec" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{icon}{label}</Button>
      {open && <div className={`${css.panel} ${side === 'left' ? css.panelLeft : css.panelRight}`}>{children(close)}</div>}
    </div>
  )
}

interface Props {
  lesson: Lesson
  steps: Step[]
  index: number
  onGo: (i: number) => void
}

/** Barre du tunnel : chapitres (aller où on veut / revenir au début), position dans le chapitre, passeport. */
export function TunnelBar({ lesson, steps, index, onGo }: Props) {
  const trials = useLearnStore((s) => s.trials)
  const reset = useLearnStore((s) => s.reset)
  const p = progress(trials)
  const n = LESSONS.findIndex((l) => l.id === lesson.id) + 1

  return (
    <div className={css.tbar}>
      <Drop side="left" icon={<ListTree className="ic mr" />} label="Chapitres">
        {(close) => (
          <>
            <div className="row" style={{ marginTop: 0 }}>
              <Link className="btn" to={`/learn/${LESSONS[0].id}/1`} onClick={close}><RotateCcw className="ic mr" />Reprendre depuis le début</Link>
              <Link className="btn sec" to="/learn" onClick={close}>Sommaire</Link>
            </div>
            <ChapterList current={lesson.id} onPick={close} />
            <div className="row">
              <Button variant="ko" size="xs" onClick={() => window.confirm('Effacer toute ta progression (quiz et épreuves validées) ?') && void reset()}>Effacer ma progression</Button>
            </div>
          </>
        )}
      </Drop>

      <div className={css.tcenter}>
        <div className={css.ttitle}>{lesson.title}</div>
        <div className={css.tsub}>Chapitre {n} / {LESSONS.length} · étape {index + 1} / {steps.length} : {steps[index].title}</div>
        <div className={css.dots}>
          {steps.map((s, i) => (
            <button key={i} type="button" title={s.title} aria-label={`Étape ${i + 1} : ${s.title}`} aria-current={i === index}
              className={`${css.dotBtn} ${i < index ? css.past : ''} ${i === index ? css.current : ''}`} onClick={() => onGo(i)} />
          ))}
        </div>
      </div>

      <Drop side="right" icon={<GraduationCap className="ic mr" />} label={`Passeport ${p.done}/${p.total}`}>
        {() => (
          <>
            <div className="hint" style={{ marginTop: 0 }}>Ta mission : valider les 6 épreuves, une par méthode.</div>
            <Passport />
          </>
        )}
      </Drop>
    </div>
  )
}
