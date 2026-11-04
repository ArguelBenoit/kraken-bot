interface TicketInput {
  /** Prix actuel de la paire. */
  price: number | null
  size: number
  feePct: number
  slPct: number
  tpPct: number
  type: 'market' | 'limit'
  limitPrice: number
}

interface TicketPreview {
  entry: number
  qty: number
  slPrice: number | null
  tpPrice: number | null
  /** Perte (≤ 0) si le stop loss est touché, frais compris. */
  lossAtSl: number | null
  /** Gain (≥ 0) si le take profit est touché, frais compris. */
  gainAtTp: number | null
  /** Rapport gain / risque (null si stop ou objectif manquant). */
  ratio: number | null
  fees: number
}

/** Aperçu d'un ordre avant envoi : quantité, prix des stops, perte/gain en monnaie et rapport gain/risque. */
export function previewTicket(i: TicketInput): TicketPreview | null {
  const entry = i.type === 'limit' ? i.limitPrice : i.price
  if (!entry || entry <= 0 || !(i.size > 0)) return null
  const fee = i.feePct / 100
  const qty = (i.size * (1 - fee)) / entry
  const net = (price: number) => qty * price * (1 - fee) - i.size
  const slPrice = i.slPct > 0 ? entry * (1 - i.slPct / 100) : null
  const tpPrice = i.tpPct > 0 ? entry * (1 + i.tpPct / 100) : null
  const lossAtSl = slPrice == null ? null : net(slPrice)
  const gainAtTp = tpPrice == null ? null : net(tpPrice)
  return {
    entry, qty, slPrice, tpPrice, lossAtSl, gainAtTp,
    ratio: lossAtSl != null && gainAtTp != null && lossAtSl < 0 ? gainAtTp / -lossAtSl : null,
    fees: i.size * fee * 2,
  }
}

/** Montants rapides (25 / 50 / 75 / 100 %) d'une base, arrondis à l'unité et plafonnés. */
export function quickSizes(base: number, cap: number): { pct: number; value: number }[] {
  return [25, 50, 75, 100].map((pct) => ({ pct, value: Math.max(0, Math.floor(Math.min(base * (pct / 100), cap))) }))
}
