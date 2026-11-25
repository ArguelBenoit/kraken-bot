import { ListChecks } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { changedKeys, configRows } from '@/lib/aiConfigView'
import type { AiStatus } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'
import css from './AiActiveConfig.module.css'

/** Carte « Configuration active » : les réglages enregistrés (ceux que le bot applique), ceux modifiés dans le formulaire sans être enregistrés étant signalés avec leur valeur saisie. */
export function AiActiveConfig({ status }: { status: AiStatus }) {
  const draft = useAiStore((s) => s.draft)
  const { config, options } = status
  const pairLabel = (pair: string) => options.pairs.find((p) => p.pair === pair)?.label.replace('/USDC', '') ?? pair
  const changed = draft ? changedKeys(draft, config) : []
  const formRows = draft ? configRows({ ...config, ...draft } as unknown as typeof config, pairLabel) : []
  return (
    <Card id="ai-active" title="Configuration active" icon={ListChecks}>
      <dl className={css.grid}>
        {configRows(config, pairLabel).map((r) => {
          const edited = changed.includes(r.key)
          return (
            <div key={r.key} style={{ display: 'contents' }}>
              <dt>{r.label}</dt>
              <dd className={edited ? css.changed : ''}>
                {r.value}
                {edited && <span className={css.form}> → formulaire : {formRows.find((f) => f.key === r.key)?.value}</span>}
              </dd>
            </div>
          )
        })}
      </dl>
      {changed.length > 0 && <div className="hint" style={{ marginTop: 8 }}>Les valeurs en orange sont modifiées dans le formulaire mais pas enregistrées : le bot applique encore celles de gauche.</div>}
    </Card>
  )
}
