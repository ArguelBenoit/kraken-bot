import { Check } from 'lucide-react'
import { checklist, isValidated, type TrialRecord, type TrialSteps } from '@/lib/learn/trials'
import css from './Learn.module.css'

/** La todo-list de validation d'une épreuve, mise à jour en direct pendant l'exercice. */
export function Checklist({ record, steps }: { record?: TrialRecord; steps: TrialSteps | null }) {
  const items = checklist(record, steps)
  const done = items.filter((i) => i.done).length
  return (
    <div>
      <ul className={css.todo}>
        {items.map((it) => (
          <li key={it.id} className={it.done ? css.done : ''}>
            <span className={css.box}>{it.done && <Check className="ic m0" strokeWidth={3} />}</span>
            <span>
              <div className={css.lbl}>{it.label}</div>
              {!it.done && <div className={css.hlp}>{it.help}</div>}
            </span>
          </li>
        ))}
      </ul>
      <div className={css.bar} style={{ marginTop: 8 }}><i style={{ width: `${(done / items.length) * 100}%` }} /></div>
      <div className="small t-mu" style={{ marginTop: 4 }}>
        {isValidated(record) ? <span className="t-ok">✔ Épreuve validée{record?.validatedAt ? ` le ${record.validatedAt}` : ''}</span> : `${done} / ${items.length} étapes`}
      </div>
    </div>
  )
}
