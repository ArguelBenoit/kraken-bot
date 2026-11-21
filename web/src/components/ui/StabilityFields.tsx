import type { AiNumericKey } from '@/lib/aiForm'
import { STABILITY_FIELDS, TREND_FILTER_TIP } from '@/lib/aiForm'
import { Accordion } from './Accordion'
import { NumberInput } from './NumberInput'
import { Tip } from './Tip'

interface Props {
  /** Identifiant de l'accordéon (état replié mémorisé par page). */
  id: string
  trendFilter: boolean
  onTrendFilter: (on: boolean) => void
  value: (name: AiNumericKey) => string | number | undefined
  onChange: (name: AiNumericKey, value: string) => void
}

/** Protection du capital du Bot IA (filtre de tendance, plafond par sens, disjoncteur, délai après un stop), communs au formulaire du bot et à celui du backtest. */
export function StabilityFields({ id, trendFilter, onTrendFilter, value, onChange }: Props) {
  return (
    <Accordion id={id} title={<>Protection du capital<Tip text="Garde-fous facultatifs, imposés par le code, qui limitent les pertes en marché baissier ou haussier. Tous désactivés par défaut." /></>}>
      <label className="check">
        <input type="checkbox" checked={trendFilter} onChange={(e) => onTrendFilter(e.target.checked)} />
        <span><b>Filtre de tendance</b><Tip text={TREND_FILTER_TIP} /></span>
      </label>
      {STABILITY_FIELDS.map((d) => <NumberInput key={d.name} def={d} value={value(d.name)} onChange={(v) => onChange(d.name, v)} />)}
    </Accordion>
  )
}
