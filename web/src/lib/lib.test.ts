import { describe, expect, it } from 'vitest'
import { parseJsonLoose, sanitizeConfig } from './configIO'
import { fm, signed } from './format'
import { buildMarkers } from './markers'
import { presetFor } from './presets'
import { rowSignal, sortScan } from './scan'
import { computeOpenTrade } from './trade'
import type { BotConfig, BotState, ScanRow } from './types'

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
    const v = computeOpenTrade(state(), cfg)!
    expect(v.trailing).toBe(false)
    expect([v.lo, v.hi]).toEqual([-2, 4])
    expect(v.gauge.entry).toBeCloseTo(33.33, 1) // (0 - -2) / 6
    expect(v.gauge.pos).toBeCloseTo(50, 1) // (1 - -2) / 6
    expect(v.tone).toBe('up')
    expect(v.zone).toBeNull()
  })
  it('signale la zone de stop et de vente', () => {
    expect(computeOpenTrade(state({ pos_price: 97 }), cfg)!.zone?.text).toBe('zone de stop atteinte')
    expect(computeOpenTrade(state({ pos_price: 105 }), cfg)!.zone?.text).toBe('zone de vente atteinte')
  })
  it('tendance : le stop suiveur remonte avec le pic', () => {
    const c = { ...cfg, strategy: 'trend', trailing_pct: 5 } as BotConfig
    const v = computeOpenTrade(state({ peak: 120, pos_price: 118 }), c)!
    expect(v.trailing).toBe(true)
    expect(v.stopPrice).toBeCloseTo(114, 5) // 120 * 0.95 > 98
  })
  it('stop ATR : utilise le prix de stop mémorisé', () => {
    const v = computeOpenTrade(state({ stop_px: 95 }), { ...cfg, atr_stop: 2 })!
    expect(v.stopPct).toBeCloseTo(5, 5)
  })
  it('null sans position ou sans prix', () => {
    expect(computeOpenTrade(state({ qty: 0 }), cfg)).toBeNull()
    expect(computeOpenTrade(state({ pos_price: null }), cfg)).toBeNull()
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

describe('configIO', () => {
  it('lit du JSON entouré de texte ou de ```', () => {
    expect(parseJsonLoose('```json\n{"pair":"ethusdc"}\n```')).toEqual({ pair: 'ethusdc' })
    expect(parseJsonLoose('voici : {"a":1} merci')).toEqual({ a: 1 })
    expect(parseJsonLoose('rien')).toBeNull()
  })
  it('ignore les champs inconnus et ne touche jamais au mode', () => {
    const r = sanitizeConfig({ pair: 'ethusdc', timeframe: 7, mode: 'live', foo: 1, strategy: 'MACD', rsi_buy: 25 })
    expect(r.values).toMatchObject({ pair: 'ETHUSDC', strategy: 'macd', rsi_buy: 25 })
    expect(r.values).not.toHaveProperty('mode')
    expect(r.ignored).toEqual(['timeframe 7', 'foo'])
  })
})

describe('presets', () => {
  it('choisit le preset le plus prudent pour une paire et une méthode', () => {
    expect(presetFor('AVAXUSDC', 'rsi')?.[0]).toBe('avaxr') // seul AVAX avec stop <= 4
    expect(presetFor('ADAUSDC', 'rsi')).toBeNull()
    expect(presetFor('ADAUSDC', 'trend')?.[0]).toBe('adae')
  })
})
