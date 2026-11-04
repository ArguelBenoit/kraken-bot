import { SIGNAL_STRATEGIES } from './constants'
import type { BotConfig, ScanRow } from './types'

export type SignalKind = 'buy' | 'bull' | 'bear' | 'overbought' | 'neutral' | 'info' | 'none'
export interface RowSignal {
  kind: SignalKind
  /** Texte principal (ex. « Croisement · achat »). */
  text: string
  /** Texte secondaire éventuel (info du signal). */
  detail?: string
}

const isSignal = (c: Pick<BotConfig, 'strategy'>) => SIGNAL_STRATEGIES.includes(c.strategy)

/** Libellé de la colonne « Signal » du tableau Marché selon la méthode active. */
export function rowSignal(x: ScanRow, c: BotConfig): RowSignal {
  if (isSignal(c)) {
    if (!x.sig) return { kind: 'none', text: '–' }
    return { kind: x.sig.buy ? 'buy' : 'info', text: x.sig.buy ? 'Signal achat' : '', detail: x.sig.info }
  }
  if (c.strategy === 'trend') {
    if (x.trend_gap == null) return { kind: 'none', text: '–' }
    if (x.trend_cross) return { kind: 'buy', text: 'Croisement · achat' }
    const g = x.trend_gap
    return g > 0 ? { kind: 'bull', text: 'Haussier', detail: `${g.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%` }
      : { kind: 'bear', text: 'Baissier', detail: `${g.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%` }
  }
  if (x.rsi == null) return { kind: 'none', text: '–' }
  if (x.rsi <= c.rsi_buy) return { kind: 'buy', text: 'Survendu · achat' }
  if (x.rsi >= c.rsi_sell) return { kind: 'overbought', text: 'Suracheté' }
  return { kind: 'neutral', text: 'Neutre' }
}

/** Couleur de la cellule RSI (vert zone d'achat, rouge zone de vente) — uniquement pour la méthode RSI. */
export function rsiTone(x: ScanRow, c: BotConfig): 'ok' | 'ko' | null {
  if (c.strategy !== 'rsi' || x.rsi == null) return null
  return x.rsi <= c.rsi_buy ? 'ok' : x.rsi >= c.rsi_sell ? 'ko' : null
}

/** Tri : lignes en erreur en bas ; puis opportunités d'abord (croisement / signal d'achat), sinon RSI croissant. */
export function sortScan(rows: ScanRow[], c: BotConfig): ScanRow[] {
  const rsi = (r: ScanRow) => r.rsi ?? 999
  const key = (a: ScanRow, b: ScanRow): number => {
    if (c.strategy === 'trend')
      return Number(b.trend_cross ?? 0) - Number(a.trend_cross ?? 0) || (b.trend_gap ?? -999) - (a.trend_gap ?? -999)
    if (isSignal(c)) return Number(b.sig?.buy ?? 0) - Number(a.sig?.buy ?? 0) || rsi(a) - rsi(b)
    return rsi(a) - rsi(b)
  }
  return [...rows].sort((a, b) => Number(!!a.error) - Number(!!b.error) || key(a, b))
}
