import { useState, type CSSProperties } from 'react'
import { Bot, MessageSquareText } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { AiDecision } from '@/lib/types'
import { ExchangeDialog } from './ExchangeDialog'
import css from './DecisionsCard.module.css'

/** Historique des analyses du modèle : sa lecture du marché et, pour chaque action proposée, si le code l'a acceptée ou refusée (et pourquoi).
 *  Un clic sur une décision ouvre l'échange complet avec le modèle (demande et réponse) ; `exchangeUrl` donne la route de cet échange (null = non conservé). */
export function DecisionsCard({ id, decisions, exchangeUrl }: { id: string; decisions: AiDecision[]; exchangeUrl: (d: AiDecision) => string | null }) {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <Card id={id} title="Décisions du modèle" icon={Bot}>
      {decisions.length === 0 && <span className="t-mu">Aucune analyse pour l&apos;instant.</span>}
      <div className="scroll-list" style={{ '--scroll-h': '460px' } as CSSProperties}>
      {decisions.map((d, i) => {
        const url = exchangeUrl(d)
        return (
        <div className={`${css.decision} ${url ? css.clickable : ''}`} key={`${d.time}-${i}`} onClick={url ? () => setOpen(url) : undefined} title={url ? 'Voir la demande et la réponse du modèle' : undefined}>
          <div className={css.time}>{d.time} · {d.mode}{url && <span className={css.see}><MessageSquareText className="ic" /> voir l&apos;échange</span>}</div>
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
        )
      })}
      </div>
      {open && <ExchangeDialog url={open} onClose={() => setOpen(null)} />}
    </Card>
  )
}
