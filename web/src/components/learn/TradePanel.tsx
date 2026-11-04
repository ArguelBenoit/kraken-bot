import { Play } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { fm, gainClass, signed } from '@/lib/format'
import { equity, type Sim } from '@/lib/learn/sim'
import type { Candle } from '@/lib/learn/methods'
import css from './Learn.module.css'

const SHARES = [0.25, 0.5, 1]
const STOP_CHOICES = [0, 2, 3, 5, 8]
const TARGET_CHOICES = [0, 3, 5, 10]

interface Props {
  sim: Sim
  candles: Candle[]
  /** Stop loss et objectif conseillés par la méthode (en %), proposés par défaut. */
  suggested: { sl: number; tp: number }
  onBuy: (share: number, stopPct: number, targetPct: number) => void
  onSell: () => void
  onFinish: () => void
}

/** Portefeuille fictif + achat (part du capital, stop loss, objectif), vente et fin d'exercice. */
export function TradePanel({ sim, candles, suggested, onBuy, onSell, onFinish }: Props) {
  const [share, setShare] = useState(0.5)
  const [stop, setStop] = useState(suggested.sl)
  const [target, setTarget] = useState(suggested.tp)
  const position = sim.position
  const price = candles[sim.cursor].close
  const pnlPct = position ? (price / position.entry - 1) * 100 : null

  return (
    <Card title="Ton portefeuille (fictif)" icon={Play}>
      <div className={css.kv}>
        <span>Valeur totale</span><b>{fm(equity(sim, candles), 2)} €</b>
        <span>Disponible</span><b>{fm(sim.cash, 2)} €</b>
        <span>Position</span><b>{position ? `${fm(position.qty, 5)} @ ${fm(position.entry, 2)}` : 'aucune'}</b>
        {pnlPct != null && <><span>Gain / perte</span><b className={gainClass(pnlPct)}>{signed(pnlPct)} %</b></>}
      </div>
      {!sim.finished && (
        <>
          <div className="hint" style={{ marginTop: 10 }}>Acheter au prix actuel ({fm(price, 2)}) :</div>
          {!position && (
            <>
              <Field label="Part du capital">
                <select value={share} onChange={(e) => setShare(Number(e.target.value))}>{SHARES.map((a) => <option key={a} value={a}>{a * 100} %</option>)}</select>
              </Field>
              <Field label="Stop loss" tip="Si le prix perd ce pourcentage depuis ton achat, tu es vendu automatiquement. Choisis-le AVANT d'acheter.">
                <select value={stop} onChange={(e) => setStop(Number(e.target.value))}>
                  {STOP_CHOICES.map((s) => <option key={s} value={s}>{s === 0 ? 'Aucun (déconseillé)' : `−${s} %`}</option>)}
                </select>
              </Field>
              <Field label="Objectif" tip="Si le gain atteint ce pourcentage, tu es vendu automatiquement. « Aucun » = tu vends toi-même ou sur signal.">
                <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                  {TARGET_CHOICES.map((s) => <option key={s} value={s}>{s === 0 ? 'Aucun' : `+${s} %`}</option>)}
                </select>
              </Field>
            </>
          )}
          <div className="row">
            <Button className="buy" onClick={() => onBuy(share, stop, target)} disabled={!!position}>Acheter</Button>
            <Button variant="ko" onClick={onSell} disabled={!position}>Vendre</Button>
            <Button variant="sec" onClick={onFinish}>Terminer</Button>
          </div>
        </>
      )}
    </Card>
  )
}
