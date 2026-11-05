import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import css from './TradeDetails.module.css'

/** Une ligne de détail : libellé et valeur ; `null` = ligne absente ; `'-'` comme libellé = séparateur. */
export type DetailRow = [label: string, value: ReactNode] | null

/** Icône « i » en haut à droite d'un trade en cours : au survol (ou au focus clavier), toutes les valeurs de la position en détail. */
export function TradeDetails({ rows }: { rows: DetailRow[] }) {
  return (
    <span className={css.wrap}>
      <button type="button" className={css.btn} aria-label="Détails du trade"><Info size={20} /></button>
      <div className={css.pop} role="tooltip">
        {rows.map((r, i) =>
          r == null ? null : r[0] === '-' ? <div key={i} className={css.sep} /> : (
            <div key={i} className={css.row}><span>{r[0]}</span><b>{r[1]}</b></div>
          ))}
      </div>
    </span>
  )
}
