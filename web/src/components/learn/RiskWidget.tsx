import { useState } from 'react'
import { fm } from '@/lib/format'
import { riskPlan } from '@/lib/learn/risk'

/** Calculette interactive : quel montant engager pour ne risquer que X % de son capital. */
export function RiskWidget() {
  const [v, setV] = useState({ capital: 1000, riskPct: 1, slPct: 3, tpPct: 6 })
  const p = riskPlan(v)
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) })
  const row = (k: keyof typeof v, label: string, min: number, max: number, step: number, unit: string) => (
    <label className="field">
      <span>{label}</span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="range" min={min} max={max} step={step} value={v[k]} onChange={set(k)} style={{ width: 160 }} />
        <b style={{ width: 70, textAlign: 'right' }}>{v[k]} {unit}</b>
      </span>
    </label>
  )
  return (
    <div style={{ border: '1px solid var(--bd)', padding: 12, margin: '14px 0' }}>
      <div className="small t-mu" style={{ marginBottom: 6 }}>Calculette : bouge les curseurs et regarde ce que ça change.</div>
      {row('capital', 'Ton capital', 100, 10000, 100, '€')}
      {row('riskPct', 'Risque max sur ce trade', 0.5, 5, 0.5, '%')}
      {row('slPct', 'Stop loss', 1, 10, 0.5, '%')}
      {row('tpPct', 'Objectif (take profit)', 1, 20, 0.5, '%')}
      <div className="summary" style={{ marginTop: 10 }}>
        <span>Perte maximale acceptée</span><b className="t-ko">−{fm(p.riskAmount, 2)} €</b>
        <span>Montant à engager dans le trade</span><b>{fm(p.size, 0)} €{p.capped && ' (plafonné au capital)'}</b>
        <span>Gain si l&apos;objectif est atteint</span><b className="t-ok">+{fm(p.gain, 2)} €</b>
        <span>Ratio gain / risque</span><b>{fm(p.ratio, 1)} pour 1</b>
        <span>Part de trades gagnants nécessaire pour ne pas perdre</span><b>{p.breakEvenWin == null ? '–' : `${fm(p.breakEvenWin * 100, 0)} %`}</b>
      </div>
      <div className="small t-mu" style={{ marginTop: 6 }}>
        Plus le ratio est élevé, moins tu as besoin d&apos;avoir raison souvent. (Hors frais, qui réduisent un peu ces chiffres.)
      </div>
    </div>
  )
}
