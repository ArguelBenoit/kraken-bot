import { ArrowDownToLine, ArrowUpFromLine, Wrench } from 'lucide-react'
import { Accordion } from '@/components/ui/Accordion'
import { Card } from '@/components/ui/Card'
import { EX_LABEL, pretty } from '@/lib/exchanges'
import type { Exchange } from '@/lib/types'
import css from './Exchanges.module.css'

/** Détail d'un échange : ce qui est envoyé au modèle (consignes, contexte, outil imposé) puis ce qu'il a répondu. */
export function ExchangeDetail({ x }: { x: Exchange }) {
  return (
    <>
      <Card title={`${x.source} · ${EX_LABEL[x.status]}`} icon={ArrowUpFromLine}>
        <div className={css.meta}>
          <span>{x.at}</span><span>{x.provider} · <b>{x.model}</b></span>
          {x.status !== 'pending' && <span>{x.seconds} s</span>}
          <span>{x.usage.in} tokens en entrée · {x.usage.out} en sortie</span>
        </div>
        {x.error && <div className="warn danger" style={{ marginTop: 10 }}>{x.error}</div>}
      </Card>

      <Card title="Demande envoyée" icon={ArrowUpFromLine}>
        <Accordion id="ex-system" title={<>Consignes (system)</>}>
          <pre className={css.text}>{x.system}</pre>
        </Accordion>
        <h3 className="t-mu" style={{ fontSize: 12, margin: '12px 0 6px' }}>Contexte (user)</h3>
        <pre className={css.text}>{pretty(x.user)}</pre>
        <Accordion id="ex-tool" title={<><Wrench className="ic" /> Outil imposé : format de la réponse</>}>
          <pre className={css.text}>{pretty(x.tool)}</pre>
        </Accordion>
      </Card>

      <Card title="Réponse du modèle" icon={ArrowDownToLine}>
        {x.status === 'pending' && <span className="t-mu">En attente de la réponse…</span>}
        {x.status !== 'pending' && x.response == null && <span className="t-mu">Pas de réponse exploitable.</span>}
        {x.response != null && <pre className={css.text}>{pretty(x.response)}</pre>}
      </Card>
    </>
  )
}
