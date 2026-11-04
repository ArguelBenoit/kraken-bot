import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { OpenTradeCard } from '@/components/trade/OpenTradeCard'
import { Button } from '@/components/ui/Button'
import { fm, fmPrice } from '@/lib/format'
import { manualTradeInput } from '@/lib/trade'
import type { ManualPosition } from '@/lib/types'
import { useManualStore } from '@/stores/manualStore'

function EditStops({ p, onDone }: { p: ManualPosition; onDone: () => void }) {
  const adjust = useManualStore((s) => s.adjust)
  const [v, setV] = useState({ sl: String(p.sl), tp: String(p.tp), trail: String(p.trail) })
  const save = async () => {
    if (await adjust(p.id, Number(v.sl || 0), Number(v.tp || 0), Number(v.trail || 0))) onDone()
  }
  const input = (k: keyof typeof v, label: string) => (
    <label className="field" style={{ margin: 0 }}>
      <span>{label}</span>
      <input style={{ width: 70 }} type="number" step="any" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </label>
  )
  return (
    <div className="row">
      {input('sl', 'SL %')}
      {input('tp', 'TP %')}
      {input('trail', 'Suiveur %')}
      <Button size="xs" onClick={save}>Valider</Button>
      <Button size="xs" variant="sec" onClick={onDone}>Annuler</Button>
    </div>
  )
}

function ManualTrade({ p, feePct, live }: { p: ManualPosition; feePct: number; live: boolean }) {
  const close = useManualStore((s) => s.closePosition)
  const [editing, setEditing] = useState(false)
  const short = p.side === 'short'

  const sell = (fraction: number) => {
    const what = fraction >= 1 ? 'toute la position' : `${fraction * 100}% de la position`
    const ok = window.confirm(`${short ? 'Racheter' : 'Vendre'} ${what} ${p.label} au prix du marché maintenant ?${live ? '\nMODE LIVE : ordre réel sur Kraken.' : ''}`)
    if (ok) void close(p.id, fraction, live)
  }

  return (
    <OpenTradeCard
      pair={short ? `${p.label} · SHORT ×${p.leverage}` : p.label}
      input={manualTradeInput(p, feePct)}
      info={
        <>
          ouvert le {p.opened}{p.trail > 0 && <> · suiveur {p.trail}% depuis le {short ? 'creux' : 'pic'}</>}
          {p.exchange_stop === true && <> · <span className="t-ok">stop posé chez Kraken ✓</span></>}
          {p.exchange_stop === false && (p.sl > 0 || p.trail > 0) && <> · <b className="t-ko">STOP NON POSÉ chez Kraken</b></>}
          {short && p.liq_price != null && <> · <span className="t-ko">liquidation ≈ {fmPrice(p.liq_price, p.entry)}</span> · report {fm(p.rollover)}</>}
        </>
      }
      actions={
        <>
          <Button size="title" variant="sec" onClick={() => sell(0.25)}>25%</Button>
          <Button size="title" variant="sec" onClick={() => sell(0.5)}>50%</Button>
          <Button size="title" variant="sec" onClick={() => setEditing((e) => !e)}>Stops</Button>
          <Button size="title" variant="ko" onClick={() => sell(1)}>
            <LogOut className="ic mr" />
            {short ? 'Tout racheter' : 'Tout vendre'}
          </Button>
        </>
      }
    >
      {editing && <EditStops p={p} onDone={() => setEditing(false)} />}
    </OpenTradeCard>
  )
}

/** Un « Trade en cours » par position ouverte à la main, avec vente partielle et réglage des stops. Rien n'est affiché sans position. */
export function ManualOpenTrades({ positions, feePct, live }: { positions: ManualPosition[]; feePct: number; live: boolean }) {
  return (
    <>
      {positions.map((p) => <ManualTrade key={p.id} p={p} feePct={feePct} live={live} />)}
    </>
  )
}
