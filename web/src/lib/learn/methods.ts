import { bollinger, ema, macd, priorExtreme, roc, rsi, type Series } from './indicators'

export type MethodId = 'rsi' | 'bollinger' | 'trend' | 'donchian' | 'macd' | 'momentum'
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface LineSpec {
  id: string
  label: string
  color: string
  data: Series
  dashed?: boolean
}
export interface SubSpec {
  title: string
  lines: LineSpec[]
  /** Histogramme (MACD). */
  histogram?: Series
  levels: { value: number; color: string; label: string }[]
}

/** Résultat d'une méthode sur tout l'historique : un signal par bougie, plus de quoi tracer les indicateurs. */
export interface MethodRun {
  buy: boolean[]
  sell: boolean[]
  /** Texte court décrivant la lecture de l'indicateur à chaque bougie (pour le coach). */
  info: string[]
  lines: LineSpec[]
  sub?: SubSpec
}

export interface MethodMeta {
  id: MethodId
  name: string
  /** Propositions de réglages simples pour débuter (en %). */
  stops: { sl: number; tp: number }
  buyRule: string
  sellRule: string
}

export const METHODS: Record<MethodId, MethodMeta> = {
  rsi: { id: 'rsi', name: 'RSI (acheter les creux)', stops: { sl: 3, tp: 5 }, buyRule: 'le RSI descend à 30 ou moins (le prix a trop baissé)', sellRule: 'le RSI monte à 70 ou plus (le prix a trop monté)' },
  bollinger: { id: 'bollinger', name: 'Bandes de Bollinger', stops: { sl: 3, tp: 5 }, buyRule: 'le prix clôture sous la bande basse (étirement excessif vers le bas)', sellRule: 'le prix revient à la moyenne (ligne du milieu)' },
  trend: { id: 'trend', name: 'Tendance (croisement de moyennes)', stops: { sl: 5, tp: 0 }, buyRule: 'la moyenne rapide passe au-dessus de la moyenne lente', sellRule: 'la moyenne rapide repasse sous la moyenne lente' },
  donchian: { id: 'donchian', name: 'Cassure (canal de Donchian)', stops: { sl: 5, tp: 0 }, buyRule: 'le prix dépasse le plus haut des 20 dernières bougies', sellRule: 'le prix passe sous le plus bas des 10 dernières bougies' },
  macd: { id: 'macd', name: 'MACD', stops: { sl: 5, tp: 0 }, buyRule: "la ligne MACD croise son signal vers le haut", sellRule: 'la ligne MACD repasse sous son signal' },
  momentum: { id: 'momentum', name: 'Momentum (suivre la force)', stops: { sl: 5, tp: 0 }, buyRule: 'le prix a gagné au moins 3 % sur les 24 dernières bougies (sans être déjà surchauffé)', sellRule: 'la hausse sur 24 bougies redevient négative' },
}

const BLUE = '#4aa3ff'
const PURPLE = '#d58bff'
const AMBER = '#ffb000'
const GREY = '#7d7a6c'
const GREEN = '#3ddc84'
const RED = '#ff4d4d'

const f = (v: number | null | undefined, d = 1) => (v == null ? '–' : v.toFixed(d))
const flags = (n: number) => Array.from({ length: n }, () => false)

/** Calcule signaux et indicateurs d'une méthode sur tout l'historique. Réglages « débutant » (ceux du bot). */
export function runMethod(id: MethodId, candles: Candle[]): MethodRun {
  const c = candles.map((k) => k.close)
  const n = c.length
  const buy = flags(n)
  const sell = flags(n)
  const info = Array.from({ length: n }, () => '')

  if (id === 'rsi') {
    const r = rsi(c, 14)
    r.forEach((v, i) => {
      if (v == null) return
      buy[i] = v <= 30
      sell[i] = v >= 70
      info[i] = `RSI = ${f(v)}`
    })
    return {
      buy, sell, info, lines: [],
      sub: { title: 'RSI (14)', lines: [{ id: 'rsi', label: 'RSI', color: AMBER, data: r }], levels: [{ value: 30, color: GREEN, label: '30 : survente' }, { value: 70, color: RED, label: '70 : surachat' }] },
    }
  }

  if (id === 'bollinger') {
    const b = bollinger(c, 20, 2)
    c.forEach((p, i) => {
      if (b.mid[i] == null) return
      buy[i] = p < (b.lower[i] as number)
      sell[i] = p >= (b.mid[i] as number)
      const pb = ((p - (b.lower[i] as number)) / ((b.upper[i] as number) - (b.lower[i] as number))) * 100
      info[i] = `position dans les bandes : ${f(pb, 0)} % (0 = bande basse, 100 = bande haute)`
    })
    return {
      buy, sell, info,
      lines: [
        { id: 'up', label: 'Bande haute', color: PURPLE, data: b.upper, dashed: true },
        { id: 'mid', label: 'Moyenne (20)', color: BLUE, data: b.mid },
        { id: 'low', label: 'Bande basse', color: PURPLE, data: b.lower, dashed: true },
      ],
    }
  }

  if (id === 'trend') {
    const fa = ema(c, 20)
    const sl = ema(c, 50)
    for (let i = 1; i < n; i++) {
      if (fa[i] == null || sl[i] == null || fa[i - 1] == null || sl[i - 1] == null) continue
      buy[i] = (fa[i - 1] as number) <= (sl[i - 1] as number) && (fa[i] as number) > (sl[i] as number)
      sell[i] = (fa[i] as number) < (sl[i] as number)
      info[i] = (fa[i] as number) > (sl[i] as number) ? 'moyenne rapide AU-DESSUS de la lente (tendance haussière)' : 'moyenne rapide SOUS la lente (tendance baissière)'
    }
    return { buy, sell, info, lines: [{ id: 'fast', label: 'Moyenne rapide (20)', color: BLUE, data: fa }, { id: 'slow', label: 'Moyenne lente (50)', color: PURPLE, data: sl }] }
  }

  if (id === 'donchian') {
    const hi = priorExtreme(candles.map((k) => k.high), 20, 'max')
    const lo = priorExtreme(candles.map((k) => k.low), 10, 'min')
    c.forEach((p, i) => {
      if (hi[i] == null || lo[i] == null) return
      buy[i] = p > (hi[i] as number)
      sell[i] = p < (lo[i] as number)
      info[i] = `${f((p / (hi[i] as number) - 1) * 100, 2)} % par rapport au plus haut des 20 dernières bougies`
    })
    return { buy, sell, info, lines: [{ id: 'hi', label: 'Plus haut 20 bougies', color: GREEN, data: hi, dashed: true }, { id: 'lo', label: 'Plus bas 10 bougies', color: RED, data: lo, dashed: true }] }
  }

  if (id === 'macd') {
    const m = macd(c, 12, 26, 9)
    for (let i = 1; i < n; i++) {
      const h = m.hist[i]
      const hp = m.hist[i - 1]
      if (h == null || hp == null || m.line[i] == null || m.signal[i] == null || m.line[i - 1] == null || m.signal[i - 1] == null) continue
      const eps = c[i] * 1e-7
      buy[i] = (m.line[i - 1] as number) <= (m.signal[i - 1] as number) && h > eps
      sell[i] = h < -eps
      info[i] = h > 0 ? 'MACD AU-DESSUS de son signal (élan haussier)' : 'MACD SOUS son signal (élan baissier)'
    }
    return {
      buy, sell, info, lines: [],
      sub: { title: 'MACD (12, 26, 9)', lines: [{ id: 'macd', label: 'MACD', color: BLUE, data: m.line }, { id: 'sig', label: 'Signal', color: AMBER, data: m.signal }], histogram: m.hist, levels: [{ value: 0, color: GREY, label: '0' }] },
    }
  }

  // momentum
  const g = roc(c, 24)
  const r = rsi(c, 14)
  g.forEach((v, i) => {
    if (v == null) return
    buy[i] = v >= 3 && (r[i] == null || (r[i] as number) < 80)
    sell[i] = v < 0
    info[i] = `variation sur 24 bougies : ${v >= 0 ? '+' : ''}${f(v, 1)} %`
  })
  return {
    buy, sell, info, lines: [],
    sub: { title: 'Variation sur 24 bougies (%)', lines: [{ id: 'roc', label: 'Variation', color: BLUE, data: g }], levels: [{ value: 3, color: GREEN, label: '+3 % : seuil d’achat' }, { value: 0, color: RED, label: '0 : seuil de vente' }] },
  }
}
