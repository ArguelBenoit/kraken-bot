/** Indicateurs techniques (purs, sans lookahead : la valeur à l'indice i ne dépend que des bougies ≤ i).
 *  Mêmes formules que `indicators.py` / `strategies.py` côté serveur. `null` = pas assez de données. */
export type Series = (number | null)[]

const empty = (n: number): Series => Array.from({ length: n }, () => null)

/** Moyenne mobile simple. */
export function sma(v: number[], n: number): Series {
  const out = empty(v.length)
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i]
    if (i >= n) sum -= v[i - n]
    if (i >= n - 1) out[i] = sum / n
  }
  return out
}

/** Moyenne mobile exponentielle, amorcée par la moyenne simple des n premières valeurs. */
export function ema(v: number[], n: number): Series {
  const out = empty(v.length)
  if (v.length < n) return out
  let e = v.slice(0, n).reduce((a, b) => a + b, 0) / n
  out[n - 1] = e
  const k = 2 / (n + 1)
  for (let i = n; i < v.length; i++) {
    e = v[i] * k + e * (1 - k)
    out[i] = e
  }
  return out
}

/** RSI (lissage de Wilder). */
export function rsi(c: number[], n: number): Series {
  const out = empty(c.length)
  if (c.length <= n) return out
  let ag = 0
  let al = 0
  for (let i = 1; i <= n; i++) {
    ag += Math.max(c[i] - c[i - 1], 0)
    al += Math.max(c[i - 1] - c[i], 0)
  }
  ag /= n
  al /= n
  for (let i = n; i < c.length; i++) {
    if (i > n) {
      const d = c[i] - c[i - 1]
      ag = (ag * (n - 1) + Math.max(d, 0)) / n
      al = (al * (n - 1) + Math.max(-d, 0)) / n
    }
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al)
  }
  return out
}

/** Bandes de Bollinger : moyenne ± k écarts-types (écart-type de population). */
export function bollinger(c: number[], n: number, k: number) {
  const mid = empty(c.length)
  const upper = empty(c.length)
  const lower = empty(c.length)
  for (let i = n - 1; i < c.length; i++) {
    const w = c.slice(i - n + 1, i + 1)
    const m = w.reduce((a, b) => a + b, 0) / n
    const sd = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / n)
    mid[i] = m
    upper[i] = m + k * sd
    lower[i] = m - k * sd
  }
  return { mid, upper, lower }
}

/** MACD = EMA rapide − EMA lente ; signal = EMA du MACD ; histogramme = MACD − signal. */
export function macd(c: number[], fast: number, slow: number, signal: number) {
  const f = ema(c, fast)
  const s = ema(c, slow)
  const line = empty(c.length)
  const idx: number[] = []
  for (let i = 0; i < c.length; i++) {
    if (f[i] != null && s[i] != null) {
      line[i] = (f[i] as number) - (s[i] as number)
      idx.push(i)
    }
  }
  const sigC = ema(idx.map((i) => line[i] as number), signal)
  const sig = empty(c.length)
  const hist = empty(c.length)
  idx.forEach((i, j) => {
    sig[i] = sigC[j]
    if (sigC[j] != null) hist[i] = (line[i] as number) - (sigC[j] as number)
  })
  return { line, signal: sig, hist }
}

/** Plus haut (ou plus bas) des n bougies PRÉCÉDENTES (la bougie courante est exclue). */
export function priorExtreme(v: number[], n: number, kind: 'max' | 'min'): Series {
  const out = empty(v.length)
  for (let i = n; i < v.length; i++) {
    const w = v.slice(i - n, i)
    out[i] = kind === 'max' ? Math.max(...w) : Math.min(...w)
  }
  return out
}

/** Variation en % sur n bougies. */
export function roc(c: number[], n: number): Series {
  const out = empty(c.length)
  for (let i = n; i < c.length; i++) out[i] = (c[i] / c[i - n] - 1) * 100
  return out
}
