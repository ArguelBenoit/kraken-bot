import type { BotConfig, BotState } from './types'

export interface OpenTradeView {
  entry: number
  px: number
  qty: number
  cost: number
  value: number
  grossGain: number
  netGain: number
  chg: number
  /** up/dn : couleur de la carte selon que le prix est au-dessus ou sous l'entrée. */
  tone: 'up' | 'dn'
  /** Méthodes à jauge « stop -> pic » (tout sauf RSI / Bollinger, qui ont un take profit fixe). */
  trailing: boolean
  stopPct: number
  stopPrice: number
  tpPct: number
  lo: number
  hi: number
  peak: number
  peakPct: number
  /** Positions de la jauge en % de sa largeur. */
  gauge: { pos: number; entry: number; fillLeft: number; fillWidth: number; positive: boolean }
  zone: { icon: 'ban' | 'target'; text: string } | null
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))

/** Calcule tout ce que la carte « Trade en cours » affiche. Renvoie null sans position ou sans prix. */
export function computeOpenTrade(st: BotState, c: BotConfig): OpenTradeView | null {
  if (!st.qty || st.entry == null || st.pos_price == null) return null
  const { entry, qty } = st
  const px = st.pos_price
  const fee = c.fee_pct / 100
  const cost = st.cost ?? (qty * entry) / (1 - fee)
  const chg = (px / entry - 1) * 100
  const value = qty * px
  const trailing = c.strategy !== 'rsi' && c.strategy !== 'bollinger'
  const stopPct = c.atr_stop > 0 && st.stop_px ? (1 - st.stop_px / entry) * 100 : c.stop_loss_pct
  const peak = Math.max(st.peak ?? entry, px)
  const peakPct = (peak / entry - 1) * 100

  let tpPct = c.take_profit_pct
  let lo = -stopPct
  let hi = tpPct
  let stopPrice = entry * (1 - stopPct / 100)
  if (trailing) {
    if (c.trailing_pct > 0 && peak * (1 - c.trailing_pct / 100) > stopPrice) stopPrice = peak * (1 - c.trailing_pct / 100)
    lo = (stopPrice / entry - 1) * 100
    hi = Math.max(peakPct, 0) + Math.max(stopPct, 1)
    tpPct = hi
  }
  const total = hi - lo
  const pos = clamp(((chg - lo) / total) * 100)
  const ent = clamp(((0 - lo) / total) * 100)

  let zone: OpenTradeView['zone'] = null
  if (trailing) {
    if (chg <= lo) zone = { icon: 'ban', text: 'stop atteint' }
  } else if (chg >= tpPct) zone = { icon: 'target', text: 'zone de vente atteinte' }
  else if (chg <= -stopPct) zone = { icon: 'ban', text: 'zone de stop atteinte' }

  return {
    entry, px, qty, cost, value, chg, trailing, stopPct, stopPrice, tpPct, lo, hi, peak, peakPct, zone,
    grossGain: value - qty * entry,
    netGain: value * (1 - fee) - cost,
    tone: px >= entry ? 'up' : 'dn',
    gauge: chg >= 0
      ? { pos, entry: ent, fillLeft: ent, fillWidth: Math.max(0, pos - ent), positive: true }
      : { pos, entry: ent, fillLeft: pos, fillWidth: Math.max(0, ent - pos), positive: false },
  }
}

/** Phrase décrivant comment la position sera vendue. */
export function exitRule(c: BotConfig, tpPct: number, st: BotState): string {
  const trail = c.trailing_pct > 0 ? ` ou stop suiveur −${c.trailing_pct}%` : ''
  if (c.strategy === 'trend') return `vente automatique si EMA${c.ma_fast} passe sous EMA${c.ma_slow}${trail}`
  if (c.strategy === 'bollinger') return `vente automatique au retour à la moyenne de Bollinger ou à +${tpPct}%`
  if (c.strategy === 'rsi') return `vente automatique si RSI ≥ ${c.rsi_sell}`
  void st
  return `vente automatique sur signal ${c.strategy}${trail}`
}
