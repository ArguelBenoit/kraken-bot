import { ListOrdered, Play, Square, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { TREND_LABEL, estimateCalls, marketLabel } from '@/lib/backtest'
import type { BtQueueItem, BtScenario, BtSummary } from '@/lib/types'
import { useBacktestStore } from '@/stores/backtestStore'
import css from './Backtest.module.css'

const KRAKEN_FEE = 0.26
const NO_SCENARIOS: BtScenario[] = []

/** Appels du modèle d'un essai en attente (même calcul que le formulaire). */
const callsOf = (p: BtQueueItem['params']) => estimateCalls(p.days, p.timeframe ?? 240, p.interval_min ?? 60)

/** Secondes par appel au modèle, moyenne des essais terminés qui ont une durée ; null sans essai de référence. */
function secondsPerCall(history: BtSummary[]): number | null {
  const ok = history.filter((h) => h.seconds && 'calls' in h.stats && h.stats.calls > 0)
  if (!ok.length) return null
  const secs = ok.reduce((a, h) => a + (h.seconds ?? 0), 0)
  const calls = ok.reduce((a, h) => a + ('calls' in h.stats ? h.stats.calls : 0), 0)
  return secs / calls
}

const duration = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${String(Math.round((s % 3600) / 60)).padStart(2, '0')}` : `${Math.max(1, Math.round(s / 60))} min`)

/** Résumé d'un essai en attente, en une ligne. */
function label(p: BtQueueItem['params'], scenarios: BtScenario[]): string {
  const fee = p.fee_pct == null ? 'frais Bot IA' : p.fee_pct === 0 && !p.short_fee_pct ? 'sans frais' : `frais ${p.fee_pct} %`
  return `${marketLabel(p.end ?? '', scenarios).split(' (')[0]} · ${p.days} j · ${p.allow_short ? 'shorts' : 'achats seuls'} · ${fee}`
}

/** File d'attente : essais lancés l'un après l'autre (utile la nuit), avec un générateur de grille de combinaisons. */
export function BacktestQueue() {
  const status = useBacktestStore((s) => s.status)
  const draft = useBacktestStore((s) => s.draft)
  const { enqueue, queueRun, queueStop, queueClear, queueRemove } = useBacktestStore.getState()
  const [ends, setEnds] = useState<string[]>([])
  const [shorts, setShorts] = useState<boolean[]>([])
  const [fees, setFees] = useState<number[]>([])
  if (!status || !draft) return null

  const { queue, options, history } = status
  const scenarios = options.scenarios ?? NO_SCENARIOS
  const perCall = secondsPerCall(history)
  const total = queue.items.reduce((a, i) => a + callsOf(i.params), 0)
  const toggle = <T,>(list: T[], set: (v: T[]) => void, v: T) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const axes: Record<string, unknown>[][] = []
  if (ends.length) axes.push(ends.map((end) => ({ end })))
  if (shorts.length) axes.push(shorts.map((allow_short) => ({ allow_short })))
  if (fees.length) axes.push(fees.map((f) => ({ fee_pct: f, short_fee_pct: f })))
  const count = axes.reduce((n, a) => n * a.length, 1)

  return (
    <Card id="bt-queue" title={`File d’attente (${queue.items.length})`} icon={ListOrdered}>
      {queue.items.length === 0 && <div className="hint">Vide. « Ajouter à la file » enregistre les réglages du formulaire ; la grille ci-dessous en ajoute plusieurs d’un coup.</div>}
      <div className={css.tabs}>
        {queue.items.map((it, i) => (
          <div className={css.tab} key={it.id}>
            <button type="button" title={label(it.params, scenarios)}>{i + 1}. {label(it.params, scenarios)}</button>
            <button type="button" className={css.x} aria-label="Retirer de la file" onClick={() => void queueRemove(it.id)}><X className="ic" /></button>
          </div>
        ))}
      </div>
      {queue.failed.length > 0 && (
        <div className="warn danger" style={{ marginTop: 8 }}>
          {queue.failed.map((f, i) => <div key={i}>Refusé : {label(f.params, scenarios)} — {f.error}</div>)}
        </div>
      )}
      {queue.items.length > 0 && (
        <div className="hint" style={{ marginTop: 8 }}>
          ≈ {total} appels au modèle au total{perCall ? ` · environ ${duration(total * perCall)} d’après tes essais précédents` : ''}.
          {queue.on && ' La file tourne : chaque essai terminé lance le suivant. Annuler l’essai en cours arrête la file.'}
        </div>
      )}
      <div className="row">
        {queue.on
          ? <Button variant="ko" onClick={() => void queueStop()}><Square className="ic f mr" />Arrêter après l’essai en cours</Button>
          : <Button disabled={queue.items.length === 0} onClick={() => void queueRun()}><Play className="ic f mr" />Lancer la file</Button>}
        <Button variant="sec" disabled={queue.items.length === 0} onClick={() => { if (confirm('Vider la file d’attente ?')) void queueClear() }}><Trash2 className="ic mr" />Vider</Button>
      </div>

      <Accordion id="bt-grid" title="Générer une grille d’essais">
        <div className="hint">Coche plusieurs valeurs : un essai est ajouté pour chaque combinaison, avec les autres réglages du formulaire. Un axe sans case cochée garde la valeur du formulaire.</div>
        <div className="small t-mu" style={{ margin: "10px 0 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Marchés testés</div>
        <label className="check"><input type="checkbox" checked={ends.includes('')} onChange={() => toggle(ends, setEnds, '')} />Aujourd&apos;hui (dernières bougies)</label>
        {scenarios.map((s) => (
          <label className="check" key={s.end}>
            <input type="checkbox" checked={ends.includes(s.end)} onChange={() => toggle(ends, setEnds, s.end)} />
            {TREND_LABEL[s.trend]} · {s.when}
          </label>
        ))}
        <div className="small t-mu" style={{ margin: "10px 0 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Sens</div>
        <label className="check"><input type="checkbox" checked={shorts.includes(false)} onChange={() => toggle(shorts, setShorts, false)} />Achats seuls</label>
        <label className="check"><input type="checkbox" checked={shorts.includes(true)} onChange={() => toggle(shorts, setShorts, true)} />Achats et shorts</label>
        <div className="small t-mu" style={{ margin: "10px 0 2px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Frais</div>
        <label className="check"><input type="checkbox" checked={fees.includes(0)} onChange={() => toggle(fees, setFees, 0)} />Sans frais</label>
        <label className="check"><input type="checkbox" checked={fees.includes(KRAKEN_FEE)} onChange={() => toggle(fees, setFees, KRAKEN_FEE)} />Frais Kraken ({KRAKEN_FEE} % par ordre, longs et shorts)</label>
        <div className="row">
          <Button variant="sec" disabled={axes.length === 0} onClick={() => void enqueue(axes).then((ok) => { if (ok) { setEnds([]); setShorts([]); setFees([]) } })}>
            Ajouter {axes.length ? `${count} essai${count > 1 ? 's' : ''}` : 'la grille'} à la file
          </Button>
        </div>
      </Accordion>
    </Card>
  )
}
