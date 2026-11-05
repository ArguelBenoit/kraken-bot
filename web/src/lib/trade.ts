import type { AiPosition, ManualPosition, Side } from './types'

/** Ce qu'il faut savoir d'une position pour l'afficher (indépendant du bot qui la gère). */
export interface OpenTradeInput {
  /** Sens de la position (long par défaut). Un short gagne quand le prix baisse : stops au-dessus, objectif en dessous. */
  side?: Side
  entry: number
  qty: number
  /** Prix actuel ; null = indisponible. */
  price: number | null
  /** Long : montant dépensé à l'achat (frais compris). Short : montant vendu (quantité × prix d'entrée). */
  cost: number
  feePct: number
  /** Frais déjà payés ou à payer en plus des frais de fermeture (short : ouverture et report). */
  fixedFees?: number
  /** Meilleur prix atteint depuis l'entrée : le plus haut pour un long, le plus bas pour un short. */
  peak?: number
  /** Prix du stop effectif (stop loss ou stop suiveur, le plus haut des deux) ; null = aucun stop. */
  stopPrice: number | null
  /** Prix de l'objectif fixe (take profit) ; null = on laisse courir. */
  tpPrice: number | null
}

export interface OpenTradeView {
  side: Side
  entry: number
  px: number
  qty: number
  cost: number
  value: number
  grossGain: number
  netGain: number
  chg: number
  /** up/dn : couleur de la carte selon que la position gagne ou perd. */
  tone: 'up' | 'dn'
  stopPrice: number | null
  /** Variation favorable (%) au niveau du stop, depuis l'entrée (négative, ou positive si un suiveur protège déjà un gain). */
  stopChg: number | null
  /** Gain net estimé (négatif = perte) si la position sort au prix du stop / de l'objectif / du pic. */
  stopGain: number | null
  exitGain: number
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
  const side = i.side ?? 'long'
  const short = side === 'short'
  const fee = i.feePct / 100
  // variation « favorable » en % depuis l'entrée : hausse pour un long, baisse pour un short
  const fav = (price: number) => (short ? (entry - price) / entry : price / entry - 1) * 100
  const chg = fav(px)
  const value = qty * px
  const peak = short ? Math.min(i.peak ?? entry, px) : Math.max(i.peak ?? entry, px)
  const peakPct = fav(peak)
  // gain net si la position était fermée à `price` (frais de fermeture et frais fixes déduits)
  const netAt = (price: number) =>
    short ? qty * (entry - price) - qty * price * fee - (i.fixedFees ?? 0) : qty * price * (1 - fee) - i.cost
  const stopChg = i.stopPrice == null ? null : fav(i.stopPrice)
  const tpChg = i.tpPrice == null ? null : fav(i.tpPrice)

  // bornes : du stop à l'objectif ; sans objectif, jusqu'au pic atteint (+ la distance du stop) ; sans stop, symétrique
  const lo = stopChg ?? -Math.max(2, Math.abs(chg) + 1)
  const hi = tpChg ?? Math.max(peakPct, 0) + Math.max(stopChg == null ? 1 : -stopChg, 1)
  const total = Math.max(hi - lo, 0.01)
  const pos = clamp(((chg - lo) / total) * 100)
  const ent = clamp(((0 - lo) / total) * 100)

  let zone: OpenTradeView['zone'] = null
  if (i.stopPrice != null && (short ? px >= i.stopPrice : px <= i.stopPrice)) zone = { icon: 'ban', text: 'zone de stop atteinte' }
  else if (i.tpPrice != null && (short ? px <= i.tpPrice : px >= i.tpPrice)) zone = { icon: 'target', text: short ? 'zone de rachat atteinte' : 'zone de vente atteinte' }

  return {
    side, entry, px, qty, cost: i.cost, value, chg, peak, peakPct, lo, hi, zone,
    stopPrice: i.stopPrice, stopChg, stopGain: i.stopPrice == null ? null : netAt(i.stopPrice), exitGain: netAt(i.tpPrice ?? peak), tpPrice: i.tpPrice, tpChg,
    grossGain: short ? qty * (entry - px) : value - qty * entry,
    netGain: netAt(px),
    tone: chg >= 0 ? 'up' : 'dn',
    gauge: chg >= 0
      ? { pos, entry: ent, fillLeft: ent, fillWidth: Math.max(0, pos - ent), positive: true }
      : { pos, entry: ent, fillLeft: pos, fillWidth: Math.max(0, ent - pos), positive: false },
  }
}

// ---------- adaptateurs : chaque bot décrit sa position avec ses propres champs ----------

const maxOrNull = (a: number | null, b: number | null) => (a == null ? b : b == null ? a : Math.max(a, b))

/** Stop effectif = le plus protecteur : le plus haut des deux pour un long, le plus bas pour un short. */
const nearest = (a: number | null, b: number | null, short: boolean) =>
  a == null ? b : b == null ? a : short ? Math.min(a, b) : Math.max(a, b)

/** Trading manuel : long ou short ; pour un short, frais fixes = ouverture (déjà payés) + report cumulé. */
export function manualTradeInput(p: ManualPosition, feePct: number): OpenTradeInput {
  const short = p.side === 'short'
  return {
    side: p.side, entry: p.entry, qty: p.qty, price: p.price, cost: short ? p.notional : p.cost, peak: p.peak, feePct,
    fixedFees: short ? (p.open_fees ?? 0) + p.rollover : 0,
    stopPrice: nearest(p.sl_price, p.trail_price, short), tpPrice: p.tp_price,
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
