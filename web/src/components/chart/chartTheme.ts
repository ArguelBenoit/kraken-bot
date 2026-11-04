/** Apparence commune des graphiques (lightweight-charts) : fond, grilles, couleurs des bougies, lignes de niveau. */
import type { ChartLevel } from '@/lib/chartTypes'

/** Options communes de tous les graphiques : fond sombre, grilles discrètes, taille automatique. */
export const CHART_OPTIONS = {
  layout: { background: { color: '#0b0b0b' }, textColor: '#7d7a6c', fontFamily: 'ui-monospace,DejaVu Sans Mono,monospace' },
  grid: { vertLines: { color: '#161616' }, horzLines: { color: '#161616' } },
  timeScale: { timeVisible: true, borderColor: '#262626' },
  rightPriceScale: { borderColor: '#262626' },
  autoSize: true,
} as const

/** Couleurs des bougies : vert à la hausse, rouge à la baisse. */
export const CANDLE_STYLE = {
  upColor: '#3ddc84', downColor: '#ff4d4d', borderVisible: false, wickUpColor: '#3ddc84', wickDownColor: '#ff4d4d',
} as const

/** Options d'une ligne de niveau en pointillés, avec son étiquette sur l'axe des prix. */
export const levelLineOptions = (l: ChartLevel) =>
  ({ price: l.price, color: l.color, lineStyle: 2, lineWidth: 1, axisLabelVisible: true, title: l.title }) as const

/** Options d'une courbe d'indicateur fine, sans étiquette de dernière valeur. */
export const indicatorLine = (color: string, dashed = false) =>
  ({ color, lineWidth: 1, lineStyle: dashed ? 2 : 0, priceLineVisible: false, lastValueVisible: false }) as const
