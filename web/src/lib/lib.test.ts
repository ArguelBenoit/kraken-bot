import { describe, expect, it } from 'vitest'
import { fm, signed } from './format'
import { buildMarkers } from './markers'
import { rowSignal, sortScan } from './scan'
import { previewTicket, quickSizes } from './ticket'
import { zapTone } from './activity'
import { aiTradeInput, botTradeInput, computeOpenTrade, manualTradeInput } from './trade'
import type { AiPosition, BotConfig, BotState, ManualPosition, ScanRow } from './types'

const cfg = {
  pair: 'ETHUSDC', mode: 'paper', strategy: 'rsi', timeframe: 240, rsi_period: 7, rsi_buy: 30, rsi_sell: 70,
  take_profit_pct: 4, stop_loss_pct: 2, order_size: 100, fee_pct: 0.26, ma_fast: 20, ma_slow: 50, trailing_pct: 5, atr_stop: 0,
} as BotConfig
const state = (over: Partial<BotState> = {}) =>
  ({ cash: 0, qty: 1, entry: 100, pnl: 0, trades: [], equity: 0, pos_price: 101, pos_rsi: null, pos_ma: null, ...over }) as BotState

describe('format', () => {
  it('formate à la française et gère l’absence', () => {
    expect(fm(null)).toBe('–')
    expect(fm(1234.5, 1)).toBe('1 234,5')
    expect(signed(-1.234)).toBe('-1,23')
    expect(signed(2)).toBe('+2')
  })
})

describe('computeOpenTrade', () => {
  it('RSI : jauge entre stop loss et take profit', () => {
    const v = computeOpenTrade(botTradeInput(state(), cfg)!)!
    expect(v.lo).toBeCloseTo(-2, 6)
    expect(v.hi).toBeCloseTo(4, 6)
    expect(v.gauge.entry).toBeCloseTo(33.33, 1) // (0 - -2) / 6
    expect(v.gauge.pos).toBeCloseTo(50, 1) // (1 - -2) / 6
    expect(v.tone).toBe('up')
    expect(v.zone).toBeNull()
  })
  it('signale la zone de stop et de vente', () => {
    expect(computeOpenTrade(botTradeInput(state({ pos_price: 97 }), cfg)!)!.zone?.text).toBe('zone de stop atteinte')
    expect(computeOpenTrade(botTradeInput(state({ pos_price: 105 }), cfg)!)!.zone?.text).toBe('zone de vente atteinte')
  })
  it('tendance : pas d’objectif, le stop suiveur remonte avec le pic', () => {
    const c = { ...cfg, strategy: 'trend', trailing_pct: 5 } as BotConfig
    const v = computeOpenTrade(botTradeInput(state({ peak: 120, pos_price: 118 }), c)!)!
    expect(v.tpPrice).toBeNull()
    expect(v.stopPrice).toBeCloseTo(114, 5) // 120 * 0.95 > 98
  })
  it('stop ATR : utilise le prix de stop mémorisé', () => {
    const v = computeOpenTrade(botTradeInput(state({ stop_px: 95 }), { ...cfg, atr_stop: 2 })!)!
    expect(v.stopChg).toBeCloseTo(-5, 5)
  })
  it('manuel : le stop effectif est le plus haut entre stop loss et suiveur ; sans stop, jauge symétrique', () => {
    const p = { entry: 100, qty: 1, price: 110, cost: 100, peak: 120, sl_price: 98, tp_price: null, trail_price: 114 } as ManualPosition
    expect(manualTradeInput(p, 0).stopPrice).toBe(114)
    const v = computeOpenTrade({ entry: 100, qty: 1, price: 101, cost: 100, feePct: 0, stopPrice: null, tpPrice: null })!
    expect(v.stopChg).toBeNull()
    expect(v.lo).toBeLessThan(0)
    expect(v.hi).toBeGreaterThan(0)
  })
  it('IA : stops en % de l’entrée', () => {
    const i = aiTradeInput({ entry: 100, qty: 1, price: 101, cost: 100, sl: 3, tp: 6, trail: 0 } as AiPosition, 0)
    expect(i.stopPrice).toBeCloseTo(97, 6)
    expect(i.tpPrice).toBeCloseTo(106, 6)
  })
  it('null sans position ou sans prix', () => {
    expect(botTradeInput(state({ qty: 0 }), cfg)).toBeNull()
    expect(computeOpenTrade(botTradeInput(state({ pos_price: null }), cfg)!)).toBeNull()
  })
})

describe('scan', () => {
  const rows: ScanRow[] = [
    { pair: 'A', label: 'A', rsi: 50, trend_gap: 1 },
    { pair: 'B', label: 'B', rsi: 20, trend_gap: -2 },
    { pair: 'C', label: 'C', error: true },
    { pair: 'D', label: 'D', rsi: 35, trend_gap: 3, trend_cross: true, sig: { buy: true, sell: false, info: 'x' } },
  ]
  it('RSI : tri croissant, erreurs en bas', () => {
    expect(sortScan(rows, cfg).map((r) => r.pair)).toEqual(['B', 'D', 'A', 'C'])
  })
  it('tendance : croisement d’abord', () => {
    expect(sortScan(rows, { ...cfg, strategy: 'trend' } as BotConfig).map((r) => r.pair)).toEqual(['D', 'A', 'B', 'C'])
  })
  it('méthodes à signaux : signal d’achat d’abord', () => {
    expect(sortScan(rows, { ...cfg, strategy: 'macd' } as BotConfig)[0].pair).toBe('D')
  })
  it('libellés de signal RSI', () => {
    expect(rowSignal(rows[1], cfg).kind).toBe('buy')
    expect(rowSignal(rows[0], cfg).kind).toBe('neutral')
    expect(rowSignal({ ...rows[0], rsi: 80 }, cfg).kind).toBe('overbought')
  })
})

describe('markers', () => {
  it('place un trade sur la bougie qui le contient', () => {
    const candles = [100, 200, 300].map((time) => ({ time, open: 1, high: 1, low: 1, close: 1 }))
    const m = buildMarkers(candles, [{ time: 250, side: 'BUY' }, { time: 50, side: 'SELL' }])
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ time: 200, shape: 'arrowUp', position: 'belowBar' })
  })
})

describe('ticket', () => {
  const base = { price: 100, size: 100, feePct: 0, slPct: 2, tpPct: 4, type: 'market' as const, limitPrice: 0 }
  it('calcule quantité, prix des stops, risque et rapport gain/risque', () => {
    const p = previewTicket(base)!
    expect(p.qty).toBeCloseTo(1, 6)
    expect(p.slPrice).toBeCloseTo(98, 6)
    expect(p.tpPrice).toBeCloseTo(104, 6)
    expect(p.lossAtSl).toBeCloseTo(-2, 6)
    expect(p.gainAtTp).toBeCloseTo(4, 6)
    expect(p.ratio).toBeCloseTo(2, 6)
  })
  it('intègre les frais et le prix limite', () => {
    const p = previewTicket({ ...base, feePct: 0.5, type: 'limit', limitPrice: 50 })!
    expect(p.entry).toBe(50)
    expect(p.qty).toBeCloseTo((100 * 0.995) / 50, 6)
    expect(p.lossAtSl!).toBeLessThan(-2) // les frais aggravent la perte
    expect(p.fees).toBeCloseTo(1, 6)
  })
  it('sans stop : pas de risque ni de ratio ; sans prix : pas d’aperçu', () => {
    expect(previewTicket({ ...base, slPct: 0 })!.ratio).toBeNull()
    expect(previewTicket({ ...base, price: null })).toBeNull()
    expect(previewTicket({ ...base, size: 0 })).toBeNull()
  })
  it('montants rapides plafonnés', () => {
    expect(quickSizes(1000, 300).map((q) => q.value)).toEqual([250, 300, 300, 300])
  })
})

describe('couleur de l’éclair du menu', () => {
  it('vert si plus de gains, rouge si plus de pertes, orange si égalité', () => {
    expect(zapTone(1, 0)).toBe('up')
    expect(zapTone(3, 2)).toBe('up')
    expect(zapTone(0, 1)).toBe('down')
    expect(zapTone(1, 4)).toBe('down')
    expect(zapTone(2, 2)).toBe('flat')
    expect(zapTone(0, 0)).toBe('flat') // ex. seulement un ordre limite en attente
    expect(zapTone(undefined, undefined)).toBe('unknown') // serveur en retard : on ne ment pas avec un orange
    expect(zapTone(2, undefined)).toBe('unknown')
  })
})
