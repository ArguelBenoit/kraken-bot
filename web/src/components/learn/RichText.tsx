import { Fragment, useRef, useState, type ReactNode } from 'react'
import { useDismiss } from '@/hooks/useDismiss'
import { TERMS } from '@/lib/learn/glossary'
import css from './Learn.module.css'

/** Mot du glossaire : cliquer (ou survoler au clavier) affiche sa définition. */
export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const t = TERMS[id]
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useDismiss(ref, () => setOpen(false), open)
  if (!t) return <>{children ?? id}</>
  return (
    <span ref={ref} style={{ position: 'relative' }}>
      <button type="button" className={css.term} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {children ?? t.term}
      </button>
      {open && (
        <span className={css.termPop} role="tooltip">
          <b>{t.term}</b>
          {t.def}
        </span>
      )}
    </span>
  )
}

const TOKEN = /\[\[([a-z-]+)(?:\|([^\]]+))?\]\]|\*\*(.+?)\*\*/g

/** Texte courant : `**gras**` et `[[mot|texte]]` (mot du glossaire cliquable). */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of text.matchAll(TOKEN)) {
    const at = m.index ?? 0
    if (at > last) out.push(<Fragment key={k++}>{text.slice(last, at)}</Fragment>)
    out.push(m[1] ? <Term key={k++} id={m[1]}>{m[2]}</Term> : <b key={k++}><RichText text={m[3]} /></b>) // le gras peut contenir un mot du glossaire
    last = at + m[0].length
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>)
  return <>{out}</>
}
