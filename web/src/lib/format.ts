/** Nombre au format français ; `–` si la valeur est absente. */
export const fm = (v: number | null | undefined, d = 2): string =>
  v == null || Number.isNaN(v) ? '–' : Number(v).toLocaleString('fr-FR', { maximumFractionDigits: d })

/** Nombre signé (+1,2). */
export const signed = (v: number, d = 2): string => `${v >= 0 ? '+' : ''}${fm(v, d)}`

/** Décimales d'affichage d'un prix selon son ordre de grandeur. */
export const priceDecimals = (price: number): number => (price < 1 ? 6 : 2)

export const fmPrice = (v: number | null | undefined, ref?: number): string =>
  v == null ? '–' : fm(v, priceDecimals(ref ?? v))

export const tone = (v: number): 'ok' | 'ko' => (v >= 0 ? 'ok' : 'ko')

export const pad2 = (n: number) => String(n).padStart(2, '0')
export const mmss = (s: number) => `${Math.floor(s / 60)} min ${pad2(s % 60)} s`
