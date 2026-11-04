import { describe, expect, it } from 'vitest'
import { bollinger, ema, macd, rsi, sma } from './indicators'
import { runMethod, type Candle, type MethodId } from './methods'
import { advance, advanceUntil, buy, createSim, equity, finish, pickStart, pickStartWithSignal, sell, summarize, EXERCISE_LEN, START_CASH } from './sim'
import { checklist, emptyRecord, isValidated, progress, trialSteps } from './trials'

// Série déterministe ; les listes d'indices viennent du code Python du bot (strategies.py / indicators.py) sur la MÊME série :
// les signaux enseignés ici doivent être exactement ceux que le bot exécute.
const N = 240
const close = Array.from({ length: N }, (_, i) => 100 + 12 * Math.sin(i / 8) + 5 * Math.sin(i * 0.9) + 0.05 * i)
const candles: Candle[] = close.map((c, i) => ({
  time: i * 3600, open: c, close: c,
  high: c + 0.8 + 0.3 * Math.abs(Math.sin(i * 1.7)),
  low: c - 0.8 - 0.3 * Math.abs(Math.sin(i * 2.3)),
}))
const PYTHON: Record<MethodId, { buy: number[]; sell: number[] }> = {"bollinger": {"buy": [123, 124, 130, 131, 173, 179, 180, 228, 229], "sell": [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 119, 120, 121, 141, 142, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219]}, "donchian": {"buy": [100, 105, 106, 113, 149, 154, 155, 161, 162, 203, 204, 210, 211], "sell": [123, 124, 129, 130, 131, 137, 138, 172, 173, 178, 179, 180, 186, 187, 221, 222, 227, 228, 229, 234, 235, 236]}, "macd": {"buy": [142, 192, 195], "sell": [117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 193, 194, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239]}, "momentum": {"buy": [100, 101, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 126, 127, 148, 149, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 175, 176, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 223, 224, 225, 226], "sell": [102, 123, 124, 125, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 150, 151, 152, 173, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 198, 199, 200, 201, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239]}, "rsi": {"buy": [], "sell": [211]}, "trend": {"buy": [105, 155, 204], "sell": [100, 101, 102, 103, 104, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 233, 234, 235, 236, 237, 238, 239]}}
const idx = (flags: boolean[]) => flags.map((f, i) => (f ? i : -1)).filter((i) => i >= 100)

describe('méthodes : mêmes signaux que le bot Python', () => {
  for (const id of Object.keys(PYTHON) as MethodId[])
    it(id, () => {
      const r = runMethod(id, candles)
      expect(idx(r.buy)).toEqual(PYTHON[id].buy)
      expect(idx(r.sell)).toEqual(PYTHON[id].sell)
    })
})

describe('indicateurs', () => {
  it('RSI et EMA = valeurs Python', () => {
    expect(rsi(close, 14)[150]).toBeCloseTo(56.65277732575669, 6)
    expect(ema(close, 20)[150]).toBeCloseTo(101.50313575576646, 6)
  })
  it('SMA, Bollinger, MACD : cohérence', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
    const b = bollinger([1, 1, 1, 1], 4, 2)
    expect(b.lower[3]).toBe(1)
    expect(b.upper[3]).toBe(1)
    const m = macd(close, 12, 26, 9)
    expect(m.line[24]).toBeNull()
    expect(m.line[25]).not.toBeNull() // EMA lente (26) disponible à partir de la 26e bougie
    expect(m.hist[32]).toBeNull()
    expect(m.hist[33]).not.toBeNull() // + 9 valeurs de MACD pour amorcer le signal
  })
})

describe('simulateur', () => {
  const flat = (n: number, price = 100): Candle[] => Array.from({ length: n }, (_, i) => ({ time: i, open: price, high: price, low: price, close: price }))
  it('achat puis vente à prix égal : on perd les frais', () => {
    const c = flat(10)
    let s = createSim(2, 8)
    s = buy(s, c, 1, 0, 0, true)
    s = sell(s, c)
    expect(s.position).toBeNull()
    expect(s.cash).toBeCloseTo(START_CASH * (1 - 0.0026) ** 2, 6)
  })
  it('le stop loss est testé avant l’objectif et exécuté au stop', () => {
    const c = flat(10)
    c[5] = { time: 5, open: 100, high: 110, low: 90, close: 100 }
    let s = createSim(2, 9)
    s = buy(s, c, 0.5, 5, 5, true)
    s = advance(s, c, 5)
    const t = s.trades[s.trades.length - 1]
    expect(t.why).toBe('stop loss touché')
    expect(t.price).toBeCloseTo(95, 6)
    expect(s.position).toBeNull()
  })
  it('un gap sous le stop s’exécute à l’ouverture (plus mauvais que le stop)', () => {
    const c = flat(10)
    c[4] = { time: 4, open: 80, high: 82, low: 79, close: 81 }
    let s = buy(createSim(2, 9), c, 1, 5, 0, null)
    s = advance(s, c, 3)
    expect(s.trades[s.trades.length - 1].price).toBe(80)
  })
  it('objectif atteint, fin d’exercice : tout est vendu et le résumé compare au « acheter et attendre »', () => {
    const c = flat(12)
    for (let i = 5; i < 12; i++) c[i] = { time: i, open: 100, high: 112, low: 100, close: 110 }
    let s = buy(createSim(2, 11), c, 1, 0, 10, true)
    s = advance(s, c, 20)
    expect(s.finished).toBe(true)
    expect(s.position).toBeNull()
    expect(s.trades.some((t) => t.why.includes('objectif'))).toBe(true)
    const sm = summarize(s, c)
    expect(sm.wins).toBe(1)
    expect(sm.followed).toBe(1)
    expect(equity(s, c)).toBeGreaterThan(START_CASH)
  })
  it('finish() clôture la position ; pickStart respecte l’échauffement et la durée', () => {
    const c = flat(10)
    const s = finish(buy(createSim(2, 8), c, 1, 0, 0, false), c)
    expect(s.finished && s.position === null).toBe(true)
    expect(pickStart(150)).toBeNull()
    const p = pickStart(400, () => 0.5)!
    expect(p.start).toBeGreaterThanOrEqual(100)
    expect(p.end - p.start).toBe(EXERCISE_LEN)
  })
})

describe('épreuves : liste de validation', () => {
  const c = Array.from({ length: 12 }, (_, i) => ({ time: i, open: 100, high: 100, low: 100, close: 100 }))
  const run = (follow: boolean, sl: number, doSell: boolean) => {
    let s = buy(createSim(2, 10), c, 0.5, sl, 0, follow)
    if (doSell) s = sell(s, c)
    return trialSteps(s)
  }
  it('progresse étape par étape', () => {
    expect(trialSteps(createSim(2, 10))).toEqual({ signalBuy: false, stop: false, closed: false })
    expect(run(false, 3, true)).toEqual({ signalBuy: false, stop: false, closed: false }) // acheté sans signal : ne compte pas
    expect(run(true, 0, true)).toEqual({ signalBuy: true, stop: false, closed: false }) // sans stop : ne compte pas
    expect(run(true, 3, false)).toEqual({ signalBuy: true, stop: true, closed: false })
    expect(run(true, 3, true)).toEqual({ signalBuy: true, stop: true, closed: true })
  })
  it('une épreuve exige le quiz ET le trade modèle ; la progression compte les méthodes validées', () => {
    expect(isValidated({ ...emptyRecord(), trade: true })).toBe(false)
    expect(isValidated({ ...emptyRecord(), quiz: true, trade: true })).toBe(true)
    const list = checklist({ ...emptyRecord(), quiz: true }, { signalBuy: true, stop: false, closed: false })
    expect(list.map((x) => x.done)).toEqual([true, true, false, false])
    expect(progress({ rsi: { ...emptyRecord(), quiz: true, trade: true } })).toMatchObject({ done: 1, total: 6, percent: 17, complete: false })
  })
})

import { LESSONS } from './lessons'
import { riskPlan } from './risk'
import { buildSteps, stepIndex } from './tunnel'

describe('calculette de risque', () => {
  it('taille de position pour ne risquer que 1 % du capital', () => {
    const p = riskPlan({ capital: 1000, riskPct: 1, slPct: 2, tpPct: 6 })
    expect(p.riskAmount).toBeCloseTo(10, 6)
    expect(p.size).toBeCloseTo(500, 6)
    expect(p.gain).toBeCloseTo(30, 6)
    expect(p.ratio).toBeCloseTo(3, 6)
    expect(p.breakEvenWin).toBeCloseTo(0.25, 6)
    expect(p.capped).toBe(false)
  })
  it('plafonne au capital quand le stop est très serré', () => {
    const p = riskPlan({ capital: 1000, riskPct: 5, slPct: 1, tpPct: 2 })
    expect(p.size).toBe(1000)
    expect(p.capped).toBe(true)
  })
})

describe('exercices guidés', () => {
  it('le départ est choisi pour qu’un signal d’achat arrive peu après', () => {
    const buyFlags = Array.from({ length: 400 }, (_, i) => i === 250 || i === 330)
    for (const r of [0, 0.3, 0.7, 0.99]) {
      const p = pickStartWithSignal(400, buyFlags, () => r)!
      const first = [250, 330].find((j) => j >= p.start + 4 && j <= p.start + 50)
      expect(first).toBeDefined()
      expect(p.end - p.start).toBe(EXERCISE_LEN)
    }
  })
  it('le début de l’exercice est calme : pas de signal pendant les premières bougies', () => {
    const buyFlags = Array.from({ length: 400 }, (_, i) => i >= 200 && i <= 260) // un long signal continu
    for (const r of [0, 0.5, 0.99]) {
      const p = pickStartWithSignal(400, buyFlags, () => r)!
      expect(buyFlags.slice(p.start, p.start + 4).some(Boolean)).toBe(false)
    }
  })
  it('retombe sur un départ aléatoire sans aucun signal, et refuse les historiques trop courts', () => {
    expect(pickStartWithSignal(400, Array.from({ length: 400 }, () => false), () => 0.5)).not.toBeNull()
    expect(pickStartWithSignal(150, [], () => 0.5)).toBeNull()
  })
  it('advanceUntil s’arrête sur le prédicat, sur un trade exécuté, ou à la fin', () => {
    const c: Candle[] = Array.from({ length: 30 }, (_, i) => ({ time: i, open: 100, high: 100, low: 100, close: 100 }))
    const s0 = createSim(2, 25)
    expect(advanceUntil(s0, c, (s) => s.cursor === 10).cursor).toBe(10)
    expect(advanceUntil(s0, c, () => false).finished).toBe(true)
    c[8] = { time: 8, open: 100, high: 100, low: 90, close: 95 }
    const held = buy(s0, c, 1, 5, 0, true)
    const after = advanceUntil(held, c, () => false)
    expect(after.cursor).toBe(8) // le stop loss a été touché : on s’arrête là
    expect(after.position).toBeNull()
  })
})

describe('tunnel : une étape à la fois, sans perdre de contenu', () => {
  it('aucun bloc n’est perdu et l’ordre est conservé, pour toutes les leçons', () => {
    for (const l of LESSONS) {
      const fromSteps = buildSteps(l).flatMap((s) => (s.kind === 'content' ? s.blocks : []))
      const original = l.blocks.filter((b) => b.t !== 'h')
      expect(fromSteps).toEqual(original)
    }
  })
  it('structure : cours, puis quiz, puis (si prévu) épreuve, puis bilan', () => {
    for (const l of LESSONS) {
      const kinds = buildSteps(l).map((s) => s.kind)
      expect(kinds[kinds.length - 1]).toBe('recap')
      expect(kinds.filter((k) => k === 'quiz')).toHaveLength(1)
      expect(kinds.includes('practice')).toBe(!!l.practice)
      expect(kinds.indexOf('quiz')).toBeLessThan(kinds.length - 1 - (l.practice ? 1 : 0) + 1)
      const firstNonContent = kinds.findIndex((k) => k !== 'content')
      expect(kinds.slice(0, firstNonContent).every((k) => k === 'content')).toBe(true)
    }
  })
  it('l’étape qui explique l’épreuve est repérée (leçons de méthode seulement)', () => {
    for (const l of LESSONS) expect(buildSteps(l).some((s) => s.kind === 'content' && s.trial)).toBe(!!l.method)
  })
  it('une introduction d’un seul bloc est fusionnée avec la suivante', () => {
    const rsi = LESSONS.find((l) => l.method === 'rsi')!
    expect(buildSteps(rsi)[0]).toMatchObject({ kind: 'content', title: 'C\'est quoi, le RSI ?' })
  })
  it('numéro d’étape de l’URL borné', () => {
    expect(stepIndex(undefined, 5)).toBe(0)
    expect(stepIndex('3', 5)).toBe(2)
    expect(stepIndex('99', 5)).toBe(4)
    expect(stepIndex('0', 5)).toBe(0)
    expect(stepIndex('abc', 5)).toBe(0)
  })
})
