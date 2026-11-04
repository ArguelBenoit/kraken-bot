interface RiskInput {
  capital: number
  /** % du capital qu'on accepte de perdre sur ce trade. */
  riskPct: number
  slPct: number
  tpPct: number
}

interface RiskPlan {
  /** Perte maximale acceptée, en monnaie. */
  riskAmount: number
  /** Montant à engager pour que le stop loss coûte exactement `riskAmount` (plafonné au capital). */
  size: number
  capped: boolean
  /** Gain visé si l'objectif est atteint. */
  gain: number
  ratio: number
  /** Part de trades gagnants nécessaire pour ne pas perdre d'argent avec ce ratio (hors frais). */
  breakEvenWin: number | null
}

/** Calculette de taille de position : combien engager pour ne risquer que X % du capital. */
export function riskPlan(i: RiskInput): RiskPlan {
  const riskAmount = (i.capital * i.riskPct) / 100
  const wanted = i.slPct > 0 ? riskAmount / (i.slPct / 100) : 0
  const size = Math.min(wanted, i.capital)
  const ratio = i.slPct > 0 ? i.tpPct / i.slPct : 0
  return { riskAmount, size, capped: wanted > i.capital, gain: (size * i.tpPct) / 100, ratio, breakEvenWin: ratio > 0 ? 1 / (1 + ratio) : null }
}
