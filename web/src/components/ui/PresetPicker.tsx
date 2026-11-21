import type { AiPreset } from '@/lib/types'
import { Tip } from './Tip'
import css from './PresetPicker.module.css'

/** « Marché en hausse » -> « Hausse » ; « Sans tendance » reste tel quel. */
const short = (label: string) => label.replace(/^Marché (en )?/, '').replace(/^./, (c) => c.toUpperCase())

/** Boutons de préréglage (un par type de marché) : un clic préremplit le formulaire ; rien n'est enregistré avant le bouton du formulaire. */
export function PresetPicker({ presets, onPick }: { presets: AiPreset[]; onPick: (p: AiPreset) => void }) {
  if (!presets?.length) return null            // serveur pas encore relancé : pas de préréglages
  return (
    <div className={`field ${css.row}`}>
      <span>
        Préréglage
        <Tip text="Préremplit le formulaire avec des réglages adaptés à un type de marché (bougie, profil, nombre de trades, stratégies, stabilité). Le modèle, le budget, le montant par trade, les frais et les paires ne changent pas. Tu peux ensuite ajuster chaque champ." />
      </span>
      <div className={css.btns}>
        {presets.map((p) => <button key={p.id} type="button" onClick={() => onPick(p)}>{short(p.label)}</button>)}
      </div>
    </div>
  )
}
