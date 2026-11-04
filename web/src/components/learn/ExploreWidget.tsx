import { useEffect, useState } from 'react'
import { errMsg } from '@/lib/api'
import { fetchCandles } from '@/lib/learn/data'
import type { Candle } from '@/lib/learn/methods'
import { fm, signed } from '@/lib/format'
import { toast } from '@/stores/uiStore'
import { ReplayChart } from './ReplayChart'

/** Décrit une bougie en mots simples. */
function describeCandle(c: Candle): string {
  const change = (c.close / c.open - 1) * 100
  const up = c.close >= c.open
  const range = ((c.high - c.low) / c.low) * 100
  return `${up ? 'Bougie VERTE' : 'Bougie ROUGE'} : le prix a ${up ? 'monté' : 'baissé'} de ${fm(Math.abs(change), 2)} % sur la période (il a ouvert à ${fm(c.open, 2)} et fini à ${fm(c.close, 2)}). Il est allé au plus haut à ${fm(c.high, 2)} et au plus bas à ${fm(c.low, 2)} : une amplitude de ${fm(range, 2)} %.`
}

/** Leçon « lire une bougie » : survole le graphique, chaque bougie est expliquée en mots simples. */
export function ExploreWidget() {
  const [candles, setCandles] = useState<Candle[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [hover, setHover] = useState<number | null>(null)

  useEffect(() => {
    fetchCandles('XBTUSDC', 240).then((c) => setCandles(c.slice(-70))).catch((e) => {
      toast.error(`Impossible de charger le graphique : ${errMsg(e)}`)
      setFailed(true)
    })
  }, [])

  if (failed) return <div className="t-mu">Graphique indisponible.</div>
  if (!candles) return <div className="t-mu">Chargement du graphique…</div>
  const c = candles[hover ?? candles.length - 1]
  return (
    <div style={{ border: '1px solid var(--bd)', padding: 10, margin: '14px 0' }}>
      <div className="small t-mu" style={{ marginBottom: 6 }}>Bitcoin, bougies de 4 heures. <b>Passe la souris sur une bougie</b> : elle est expliquée juste en dessous.</div>
      <ReplayChart candles={candles} window={0} height={300} onHover={setHover} />
      <div className="t-ac" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6 }}>
        {describeCandle(c)} <span className="t-mu">({signed((c.close / c.open - 1) * 100)} %)</span>
      </div>
    </div>
  )
}
