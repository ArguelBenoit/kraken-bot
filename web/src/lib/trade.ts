import type { AiPosition, ManualPosition } from './types'

/** Ce qu'il faut savoir d'une position pour l'afficher (indépendant du bot qui la gère). */
export interface OpenTradeInput {
  entry: number
  qty: number
  /** Prix actuel ; null = indisponible. */
  price: number | null
  /** Montant dépensé à l'achat (frais d'achat inclus). */
  cost: number
  feePct: number
  /** Plus haut atteint depuis l'achat. */
  peak?: number
  /** Prix du stop effectif (stop loss ou stop suiveur, le plus haut des deux) ; null = aucun stop. */
  stopPrice: number | null
  /** Prix de l'objectif fixe (take profit) ; null = on laisse courir. */
  tpPrice: number | null
}

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
  stopPrice: number | null
  /** Variation (%) au niveau du stop, depuis l'entrée (négative, ou positive si un suiveur protège déjà un gain). */
  stopChg: number | null
  tpPrice: number | null
  tpChg: number | null
  peak: number
  peakPct: number
  /** Bornes de la jauge en % depuis l'entrée. */
  lo: number
  hi: number
  /** Positions de la jauge en % de sa largeur. */
  gauge: { pos: number; entry: number; fillLeft: number; fillWidth: number; positive: boolean }
  zone: { icon: 'ban' | 'target'; text: string } | null
}

const clamp = (v: number, a = 0, b = 100) => Math.max(a, Math.min(b, v))

/** Calcule tout ce que la carte « Trade en cours » affiche. Renvoie null sans prix. */
export function computeOpenTrade(i: OpenTradeInput): OpenTradeView | null {
  const px = i.price
  if (px == null || !i.qty || i.entry <= 0) return null
  const { entry, qty } = i
  const fee = i.feePct / 100
  const chg = (px / entry - 1) * 100
  const value = qty * px
  const peak = Math.max(i.peak ?? entry, px)
  const peakPct = (peak / entry - 1) * 100
  const stopChg = i.stopPrice == null ? null : (i.stopPrice / entry - 1) * 100
  const tpChg = i.tpPrice == null ? null : (i.tpPrice / entry - 1) * 100

  // bornes : du stop à l'objectif ; sans objectif, jusqu'au pic atteint (+ la distance du stop) ; sans stop, symétrique
  const lo = stopChg ?? -Math.max(2, Math.abs(chg) + 1)
  const hi = tpChg ?? Math.max(peakPct, 0) + Math.max(stopChg == null ? 1 : -stopChg, 1)
  const total = Math.max(hi - lo, 0.01)
  const pos = clamp(((chg - lo) / total) * 100)
  const ent = clamp(((0 - lo) / total) * 100)

  let zone: OpenTradeView['zone'] = null
  if (i.stopPrice != null && px <= i.stopPrice) zone = { icon: 'ban', text: 'zone de stop atteinte' }
  else if (i.tpPrice != null && px >= i.tpPrice) zone = { icon: 'target', text: 'zone de vente atteinte' }

  return {
    entry, px, qty, cost: i.cost, value, chg, peak, peakPct, lo, hi, zone,
    stopPrice: i.stopPrice, stopChg, tpPrice: i.tpPrice, tpChg,
    grossGain: value - qty * entry,
    netGain: value * (1 - fee) - i.cost,
    tone: px >= entry ? 'up' : 'dn',
    gauge: chg >= 0
      ? { pos, entry: ent, fillLeft: ent, fillWidth: Math.max(0, pos - ent), positive: true }
      : { pos, entry: ent, fillLeft: pos, fillWidth: Math.max(0, ent - pos), positive: false },
  }
}

// ---------- adaptateurs : chaque bot décrit sa position avec ses propres champs ----------

const maxOrNull = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b))

/** Trading manuel : stop effectif = le plus haut entre stop loss et stop suiveur. */
export function manualTradeInput(p: ManualPosition, feePct: number): OpenTradeInput {
  return {
    entry: p.entry, qty: p.qty, price: p.price, cost: p.cost, peak: p.peak, feePct,
    stopPrice: maxOrNull(p.sl_price, p.trail_price), tpPrice: p.tp_price,
  }
}

/** Bot IA : stops en % de l'entrée (suiveur depuis le pic). */
export function aiTradeInput(p: AiPosition, feePct: number): OpenTradeInput {
  const peak = Math.max(p.peak ?? p.entry, p.price)
  const sl = p.sl > 0 ? p.entry * (1 - p.sl / 100) : null
  const trail = p.trail > 0 ? peak * (1 - p.trail / 100) : null
  return {
    entry: p.entry, qty: p.qty, price: p.price, cost: p.cost, peak, feePct,
    stopPrice: maxOrNull(sl, trail), tpPrice: p.tp > 0 ? p.entry * (1 + p.tp / 100) : null,
  }
}
