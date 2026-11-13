import type { NumberField } from '@/lib/aiForm'
import { Field } from './Field'

interface Props {
  def: NumberField
  /** Valeur saisie (texte : le champ peut être vide). */
  value: string | number | undefined
  onChange: (value: string) => void
}

/** Champ numérique des réglages du Bot IA (libellé, infobulle et texte « vide = … » viennent de `NumberField`). */
export function NumberInput({ def, value, onChange }: Props) {
  return (
    <Field label={def.label} tip={def.tip}>
      <input type="number" step={def.step ?? 'any'} min={def.min} max={def.max} placeholder={def.empty} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </Field>
  )
}
