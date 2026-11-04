import type { Candle } from './methods'

/** Simulateur de replay : on rejoue un moment passé du marché, bougie par bougie, sans connaître la suite. Paper uniquement. */
export const FEE = 0.0026
export const START_CASH = 1000
export const EXERCISE_LEN = 80

export interface Position {
  qty: number
  entry: number
  cost: number
  /** Prix du stop loss / de l'objectif (null = aucun). */
  sl: number | null
  tp: number | null
  openedAt: number
}

export interface SimTrade {
  index: number
  time: number
  side: 'BUY' | 'SELL'
  price: number
  qty: number
  /** Gain/perte en monnaie (ventes seulement). */
  pnl: number | null
  why: string
  /** L'achat suivait-il le signal de la méthode ? */
  followedSignal: boolean | null
  /** Un stop loss était-il posé sur cet achat ? */
  withStop: boolean | null
}

export interface Sim {
  /** Indice de la première bougie de l'exercice. */
  start: number
  /** Dernière bougie visible actuellement. */
  cursor: number
  /** Dernière bougie de l'exercice. */
  end: number
  cash: number
  position: Position | null
  trades: SimTrade[]
  finished: boolean
}

export const createSim = (start: number, end: number): Sim => ({ start, cursor: start, end, cash: START_CASH, position: null, trades: [], finished: false })

export function equity(s: Sim, candles: Candle[]): number {
  const p = s.position
  return s.cash + (p ? p.qty * candles[s.cursor].close * (1 - FEE) : 0)
}

/** Achat au prix de clôture de la dernière bougie visible. `pct` = part du capital engagée (0-1). */
export function buy(s: Sim, candles: Candle[], pct: number, slPct: number, tpPct: number, followedSignal: boolean | null): Sim {
  if (s.position || s.finished) return s
  const price = candles[s.cursor].close
  const size = s.cash * Math.min(Math.max(pct, 0.01), 1)
  if (size < 1) return s
  const qty = (size * (1 - FEE)) / price
  const position: Position = {
    qty, entry: price, cost: size, openedAt: s.cursor,
    sl: slPct > 0 ? price * (1 - slPct / 100) : null,
    tp: tpPct > 0 ? price * (1 + tpPct / 100) : null,
  }
  const trade: SimTrade = { index: s.cursor, time: candles[s.cursor].time, side: 'BUY', price, qty, pnl: null, why: 'achat', followedSignal, withStop: slPct > 0 }
  return { ...s, cash: s.cash - size, position, trades: [...s.trades, trade] }
}

function close(s: Sim, index: number, time: number, price: number, why: string): Sim {
  const p = s.position
  if (!p) return s
  const proceeds = p.qty * price * (1 - FEE)
  const trade: SimTrade = { index, time, side: 'SELL', price, qty: p.qty, pnl: proceeds - p.cost, why, followedSignal: null, withStop: null }
  return { ...s, cash: s.cash + proceeds, position: null, trades: [...s.trades, trade] }
}

/** Vente manuelle au prix de clôture de la dernière bougie visible. */
export function sell(s: Sim, candles: Candle[], why = 'vente manuelle'): Sim {
  if (!s.position) return s
  const k = candles[s.cursor]
  return close(s, s.cursor, k.time, k.close, why)
}

/** Avance de `steps` bougies. À chaque bougie, le stop loss est testé avant l'objectif (hypothèse prudente) ; un gap d'ouverture exécute au prix d'ouverture. */
export function advance(s: Sim, candles: Candle[], steps: number): Sim {
  let cur = s
  for (let k = 0; k < steps && !cur.finished; k++) {
    const j = cur.cursor + 1
    if (j > cur.end) break
    const c = candles[j]
    cur = { ...cur, cursor: j }
    const p = cur.position
    if (p) {
      if (p.sl != null && c.low <= p.sl) cur = close(cur, j, c.time, Math.min(c.open, p.sl), 'stop loss touché')
      else if (p.tp != null && c.high >= p.tp) cur = close(cur, j, c.time, Math.max(c.open, p.tp), 'objectif (take profit) atteint')
    }
    if (cur.cursor >= cur.end) {
      cur = sell(cur, candles, 'fin de l’exercice')
      cur = { ...cur, finished: true }
    }
  }
  return cur
}

/** Avance bougie par bougie jusqu'à ce que `stop` soit vrai, qu'un trade soit exécuté (stop, objectif…) ou que l'exercice se termine. */
export function advanceUntil(s: Sim, candles: Candle[], stop: (s: Sim) => boolean, max = 300): Sim {
  const trades = s.trades.length
  let cur = s
  for (let i = 0; i < max && !cur.finished; i++) {
    cur = advance(cur, candles, 1)
    if (cur.trades.length !== trades || stop(cur)) break
  }
  return cur
}

/** Termine l'exercice maintenant (vend ce qui reste). */
export function finish(s: Sim, candles: Candle[]): Sim {
  return { ...sell(s, candles, 'fin de l’exercice'), finished: true }
}

export interface Summary {
  resultPct: number
  resultAmount: number
  /** Ce qu'aurait donné l'achat au début puis la détention jusqu'à la fin (même période, frais compris). */
  buyHoldPct: number
  sells: number
  wins: number
  followed: number
  buys: number
}

export function summarize(s: Sim, candles: Candle[]): Summary {
  const final = equity(s, candles)
  const first = candles[s.start].close
  const last = candles[s.cursor].close
  const bh = ((START_CASH * (1 - FEE) * (last / first) * (1 - FEE)) / START_CASH - 1) * 100
  const sells = s.trades.filter((t) => t.side === 'SELL')
  const buys = s.trades.filter((t) => t.side === 'BUY')
  return {
    resultPct: (final / START_CASH - 1) * 100, resultAmount: final - START_CASH, buyHoldPct: bh,
    sells: sells.length, wins: sells.filter((t) => (t.pnl ?? 0) > 0).length,
    buys: buys.length, followed: buys.filter((t) => t.followedSignal).length,
  }
}

/**
 * Comme `pickStart`, mais choisit un moment où la méthode donne un signal d'achat peu après le départ (entre `lead[0]` et `lead[1]` bougies) :
 * un débutant doit voir au moins un signal pendant l'exercice. Retombe sur un départ aléatoire si aucun moment ne convient.
 */
export function pickStartWithSignal(len: number, buy: boolean[], rand: () => number = Math.random, warmup = 100, lead: [number, number] = [4, 50]) {
  const maxStart = len - 1 - EXERCISE_LEN
  if (maxStart <= warmup) return null
  const candidates: number[] = []
  for (let s = warmup; s <= maxStart; s++) {
    if (buy.slice(s, s + lead[0]).some(Boolean)) continue // début calme : le signal doit arriver APRÈS quelques bougies
    for (let j = s + lead[0]; j <= s + lead[1]; j++) {
      if (buy[j] && !buy[j - 1]) { candidates.push(s); break }
    }
  }
  if (!candidates.length) return pickStart(len, rand, warmup)
  const start = candidates[Math.floor(rand() * candidates.length)]
  return { start, end: start + EXERCISE_LEN }
}

/** Point de départ aléatoire : assez d'historique avant (indicateurs) et assez de bougies après (exercice). */
export function pickStart(len: number, rand: () => number = Math.random, warmup = 100): { start: number; end: number } | null {
  const maxStart = len - 1 - EXERCISE_LEN
  if (maxStart <= warmup) return null
  const start = warmup + Math.floor(rand() * (maxStart - warmup + 1))
  return { start, end: start + EXERCISE_LEN }
}
