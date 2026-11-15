import { MessagesSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EX_LABEL } from '@/lib/exchanges'
import { useExchangesStore } from '@/stores/exchangesStore'
import { confirmAction } from '@/stores/uiStore'
import css from './Exchanges.module.css'

/** Les derniers appels aux modèles (40 max, depuis le démarrage du serveur) : un clic ouvre le détail ; la corbeille vide le journal. */
export function ExchangeList() {
  const list = useExchangesStore((s) => s.list) ?? []        // pas de `?? []` dans le sélecteur : un nouveau tableau à chaque lecture bouclerait
  const selectedId = useExchangesStore((s) => s.selectedId)
  const { select, clear } = useExchangesStore.getState()
  const current = selectedId ?? list[0]?.id
  const askClear = async () => {
    if (await confirmAction({ title: 'Vider le journal ?', danger: true, confirmLabel: 'Vider', message: 'Les échanges affichés seront effacés (les appels futurs seront de nouveau enregistrés).' })) await clear()
  }
  return (
    <Card title="Échanges" icon={MessagesSquare}
      actions={list.length > 0 && <Button size="title" variant="sec" title="Vider le journal" onClick={() => void askClear()}><Trash2 className="ic m0" /></Button>}>
      {list.length === 0 && <span className="t-mu">Aucun appel depuis le démarrage du serveur. Lance une analyse du Bot IA ou une proposition du Trading.</span>}
      <div className="scroll-list">
        {list.map((x) => (
          <button key={x.id} type="button" className={`${css.item} ${x.id === current ? css.on : ''}`} onClick={() => void select(x.id)}>
            <b>{x.source}</b> · {x.model}
            <br /><span className={css.sub}>
              {x.at} · <span className={x.status === 'error' ? 't-ko' : x.status === 'ok' ? 't-ok' : ''}>{EX_LABEL[x.status]}</span>
              {x.status !== 'pending' && ` · ${x.seconds} s · ${x.usage.in}/${x.usage.out} tokens`}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
