import { MessageSquareText, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { api, errMsg } from '@/lib/api'
import { EX_LABEL, pretty } from '@/lib/exchanges'
import type { Exchange } from '@/lib/types'
import css from './ExchangeDialog.module.css'

/** Fenêtre d'un échange avec le modèle : ce qui lui a été envoyé (consignes, contexte) puis ce qu'il a répondu. `url` : route qui renvoie l'échange. Échap ou un clic à côté ferme. */
export function ExchangeDialog({ url, onClose }: { url: string; onClose: () => void }) {
  const [x, setX] = useState<Exchange | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.get<Exchange>(url).then((e) => alive && setX(e)).catch((e) => alive && setError(errMsg(e)))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => { alive = false; window.removeEventListener('keydown', onKey) }
  }, [url, onClose])

  return (
    <div className={css.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={css.dialog} role="dialog" aria-modal="true" aria-label="Échange avec le modèle">
        <h2 className={css.head}><MessageSquareText className="ic" />Échange avec le modèle<Button variant="sec" className={css.close} onClick={onClose}><X className="ic" /></Button></h2>
        <div className={css.body}>
          {!x && !error && <span className="t-mu">Chargement…</span>}
          {error && <div className="warn danger">{error}</div>}
          {x && (
            <>
              <div className={css.meta}>
                {x.at && <span>{x.at}</span>}
                {x.model && <span>{x.provider} · <b>{x.model}</b></span>}
                {x.status && <span>{EX_LABEL[x.status]}</span>}
                {x.seconds != null && x.status !== 'pending' && <span>{x.seconds} s</span>}
                <span>{x.usage.in} tokens en entrée · {x.usage.out} en sortie</span>
              </div>
              {x.error && <div className="warn danger">{x.error}</div>}
              <h3 className={css.title}>Réponse du modèle</h3>
              {x.response == null ? <span className="t-mu">Pas de réponse exploitable.</span> : <pre className={css.text}>{pretty(x.response)}</pre>}
              <h3 className={css.title}>Contexte envoyé (user)</h3>
              <pre className={css.text}>{pretty(x.user)}</pre>
              <h3 className={css.title}>Consignes (system)</h3>
              <pre className={css.text}>{x.system}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
