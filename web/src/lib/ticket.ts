import { LIQ_LOSS } from './constants'
import type { ManualConfig, Side } from './types'

/** Formulaire d'ordre (valeurs en texte tant que l'utilisateur tape). */
export interface Ticket {
  side: Side
  /** Short : levier. */
  leverage: string
  pair: string
  size: string
  type: 'market' | 'limit'
  limit: string
  sl: string
  tp: string
  trail: string
}

interface TicketInput {
  /** Prix actuel de la paire. */
  price: number | null
  size: number
  feePct: number
  slPct: number
  tpPct: number
  type: 'market' | 'limit'
  limitPrice: number
  side: Side
  /** Short : levier (2 et plus) et frais d'ouverture de la marge (%). */
  leverage: number
  marginFeePct: number
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
  /** Short : garantie immobilisée et prix de liquidation estimé. */
  collateral: number | null
  liqPrice: number | null
}

/** Distance de liquidation (en %) d'un short pour un levier donné, comme côté serveur. */
export const liqDistance = (leverage: number) => (LIQ_LOSS / leverage) * 100

/** Aperçu d'un ordre avant envoi : quantité, prix des stops, perte/gain en monnaie, rapport gain/risque, et pour un short garantie et liquidation. */
export function previewTicket(i: TicketInput): TicketPreview | null {
  const entry = i.type === 'limit' ? i.limitPrice : i.price
  if (!entry || entry <= 0 || !(i.size > 0)) return null
  const fee = i.feePct / 100
  const short = i.side === 'short'
  const qty = short ? i.size / entry : (i.size * (1 - fee)) / entry
  const openFees = short ? (i.size * (i.feePct + i.marginFeePct)) / 100 : i.size * fee
  // gain net si on ferme à `price` : tous les frais compris
  const net = (price: number) => (short ? (entry - price) * qty - openFees - price * qty * fee : qty * price * (1 - fee) - i.size)
  const dir = short ? 1 : -1
  const slPrice = i.slPct > 0 ? entry * (1 + (dir * i.slPct) / 100) : null
  const tpPrice = i.tpPct > 0 ? entry * (1 - (dir * i.tpPct) / 100) : null
  const lossAtSl = slPrice == null ? null : net(slPrice)
  const gainAtTp = tpPrice == null ? null : net(tpPrice)
  return {
    entry, qty, slPrice, tpPrice, lossAtSl, gainAtTp,
    ratio: lossAtSl != null && gainAtTp != null && lossAtSl < 0 ? gainAtTp / -lossAtSl : null,
    fees: openFees + i.size * fee,
    collateral: short ? i.size / i.leverage : null,
    liqPrice: short ? entry * (1 + liqDistance(i.leverage) / 100) : null,
  }
}

/** Montants rapides (25 / 50 / 75 / 100 %) d'une base, arrondis à l'unité et plafonnés. */
export function quickSizes(base: number, cap: number): { pct: number; value: number }[] {
  return [25, 50, 75, 100].map((pct) => ({ pct, value: Math.max(0, Math.floor(Math.min(base * (pct / 100), cap))) }))
}

/** Aperçu du ticket tel que saisi, avec les frais des réglages et le prix actuel de sa paire. */
export function previewFromTicket(t: Ticket, cfg: ManualConfig, price: number | null): TicketPreview | null {
  return previewTicket({
    price, size: Number(t.size), feePct: cfg.fee_pct, slPct: Number(t.sl || 0), tpPct: Number(t.tp || 0), type: t.type,
    limitPrice: Number(t.limit), side: t.side, leverage: Number(t.leverage) || 2, marginFeePct: cfg.margin_fee_pct,
  })
}
