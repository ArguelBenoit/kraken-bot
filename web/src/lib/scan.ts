import { RSI_OVERBOUGHT, RSI_OVERSOLD } from './constants'
import type { ScanRow } from './types'

/** Couleur de la cellule RSI : vert en zone de survente, rouge en zone de surachat. */
export function rsiTone(x: ScanRow): 'ok' | 'ko' | null {
  if (x.rsi == null) return null
  return x.rsi <= RSI_OVERSOLD ? 'ok' : x.rsi >= RSI_OVERBOUGHT ? 'ko' : null
}

/** Couleur du %B de Bollinger : vert sous la bande basse (achat selon la méthode Bollinger), rouge au-dessus de la bande haute. */
export function bollingerTone(x: ScanRow): 'ok' | 'ko' | null {
  if (x.pctb == null) return null
  return x.pctb < 0 ? 'ok' : x.pctb > 1 ? 'ko' : null
}

/** Tri du tableau Marché : lignes en erreur en bas, puis RSI croissant (les plus survendues, donc les rebonds possibles, en haut). */
export function sortScan(rows: ScanRow[]): ScanRow[] {
  const rsi = (r: ScanRow) => r.rsi ?? 999
  return [...rows].sort((a, b) => Number(!!a.error) - Number(!!b.error) || rsi(a) - rsi(b))
}
