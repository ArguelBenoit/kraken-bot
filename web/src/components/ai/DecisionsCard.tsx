import { Bot } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { AiDecision } from '@/lib/types'
import css from './DecisionsCard.module.css'

/** Historique des analyses du modèle : sa lecture du marché et, pour chaque action proposée, si le code l'a acceptée ou refusée (et pourquoi). */
export function DecisionsCard({ decisions }: { decisions: AiDecision[] }) {
  return (
    <Card title="Décisions du modèle" icon={Bot}>
      {decisions.length === 0 && <span className="t-mu">Aucune analyse pour l&apos;instant.</span>}
      {decisions.map((d, i) => (
        <div className={css.decision} key={`${d.time}-${i}`}>
          <div className={css.time}>{d.time} · {d.mode}</div>
          <div>{d.view}</div>
          {d.actions.length ? (
            <ul className={css.actions}>
              {d.actions.map((a, j) => (
                <li key={j} className={a.ok ? 't-ok' : 't-ko'}>
                  {a.ok ? '✔' : '✘'} {a.text}
                  {a.reason && <><br /><small className="t-mu">{a.reason}</small></>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="t-mu">Aucune action.</div>
          )}
        </div>
      ))}
    </Card>
  )
}
