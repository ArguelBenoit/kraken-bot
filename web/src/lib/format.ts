/** Formatage des nombres à la française et helpers d'affichage partagés par toutes les pages. */

/** Nombre au format français ; `–` si la valeur est absente. */
export const fm = (v: number | null | undefined, d = 2): string =>
  v == null || Number.isNaN(v) ? '–' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d })

/** Nombre signé (+1,2). */
export const signed = (v: number, d = 2): string => `${v >= 0 ? '+' : ''}${fm(v, d)}`

/** Prix avec assez de décimales pour les petites valeurs (SHIB, DOGE…) ; la précision suit `ref` (par défaut le prix lui-même). */
export const fmPrice = (v: number | null | undefined, ref?: number): string =>
  v == null ? '–' : fm(v, (ref ?? v) < 1 ? 6 : 2)

/** Classe CSS de couleur : vert pour un gain (>= 0), rouge pour une perte. */
export const gainClass = (v: number): 't-ok' | 't-ko' => (v >= 0 ? 't-ok' : 't-ko')

/** Classe CSS de couleur d'un achat (vert) ou d'une vente (rouge). */
export const sideClass = (side: 'BUY' | 'SELL'): 't-ok' | 't-ko' => (side === 'BUY' ? 't-ok' : 't-ko')

/** Durée en secondes -> « 3 min 05 s ». */
export const mmss = (s: number): string => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`
