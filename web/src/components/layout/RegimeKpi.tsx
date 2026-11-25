import { Kpi } from '@/components/layout/Header'
import { usePolling } from '@/hooks/usePolling'
import { api } from '@/lib/api'
import { TREND_LABEL } from '@/lib/backtest'
import { gainClass, signed } from '@/lib/format'
import type { MarketRegime } from '@/lib/types'
import { useState } from 'react'

const REFRESH_MS = 300_000
const PRESET_LABEL = { hausse: 'Marché en hausse', baisse: 'Marché en baisse', range: 'Sans tendance' } as const

/** Indicateur du bandeau : tendance du marché (médiane des paires suivies sur 14 jours) et sa variation, avec le préréglage à utiliser. */
export function RegimeKpi() {
  const [regime, setRegime] = useState<MarketRegime | null>(null)
  usePolling(() => api.get<MarketRegime>('/api/regime').then(setRegime).catch(() => undefined), REFRESH_MS)
  const tip = regime
    ? `Variation médiane des ${regime.pairs} paires suivies sur ${regime.days} jours (${signed(regime.long_change_pct, 1)} % sur ${regime.long_days} jours) : hausse ou baisse au-delà de ±${regime.threshold_pct} %, sinon sans tendance. ${regime.agree} paires sur ${regime.pairs} vont dans le même sens${regime.btc_change_pct === null ? '' : `, le bitcoin seul fait ${signed(regime.btc_change_pct, 1)} %`}. Même classement que les marchés du backtest. Préréglage conseillé : « ${PRESET_LABEL[regime.trend]} ».`
    : 'Variation médiane des paires suivies sur 14 jours.'
  return (
    <Kpi label="Marché" tip={tip}>
      {regime
        ? <b className={regime.trend === 'range' ? '' : gainClass(regime.change_pct)}>{TREND_LABEL[regime.trend]} {signed(regime.change_pct, 1)} %</b>
        : <b>–</b>}
    </Kpi>
  )
}
