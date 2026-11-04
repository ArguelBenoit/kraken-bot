import { Check, FastForward, Pause, Play, SkipForward, StepForward } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { fm, signed } from '@/lib/format'
import { coach } from '@/lib/learn/coach'
import { fetchCandles, LEARN_PAIRS, LEARN_TFS } from '@/lib/learn/data'
import { METHODS, runMethod, type Candle, type MethodId } from '@/lib/learn/methods'
import { advance, advanceUntil, buy, createSim, equity, finish, pickStart, pickStartWithSignal, sell, summarize, EXERCISE_LEN, START_CASH, type Sim } from '@/lib/learn/sim'
import { isValidated, trialSteps } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'
import { Checklist } from './Checklist'
import { RichText } from './RichText'
import css from './Learn.module.css'
import { ReplayChart, type ChartMarker, type PriceLevel } from './ReplayChart'

interface Props {
  method: MethodId | 'none'
  pair: string
  tf: number
  instruction: string
}

const SL_OPTIONS = [0, 2, 3, 5, 8]
const TP_OPTIONS = [0, 3, 5, 10]
const REVEAL_EXTRA = 40

/** Exercice de replay : un vrai moment passé du marché, révélé bougie par bougie. 100 % simulé (aucun ordre n'est envoyé nulle part). */
export function PracticeArena({ method, pair: pair0, tf: tf0, instruction }: Props) {
  const meta = method === 'none' ? null : METHODS[method]
  const trial = useLearnStore((s) => (method === 'none' ? undefined : s.trials[method]))
  const { completeTrade, recordAttempt } = useLearnStore.getState()

  const [pair, setPair] = useState(pair0)
  const [tf, setTf] = useState(tf0)
  const [candles, setCandles] = useState<Candle[] | null>(null)
  const [sim, setSim] = useState<Sim | null>(null)
  const [session, setSession] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [auto, setAuto] = useState(false)
  const [guide, setGuide] = useState(true)
  const [reveal, setReveal] = useState(false)
  const [amount, setAmount] = useState(0.5)
  const [sl, setSl] = useState(meta?.stops.sl ?? 3)
  const [tp, setTp] = useState(meta?.stops.tp ?? 5)
  const credited = useRef({ trade: false, attempt: false })

  const run = useMemo(() => (candles && method !== 'none' ? runMethod(method, candles) : null), [candles, method])

  const start = async () => {
    setLoading(true)
    setError('')
    try {
      const data = candles && pair === lastLoad.current.pair && tf === lastLoad.current.tf ? candles : await fetchCandles(pair, tf)
      lastLoad.current = { pair, tf }
      // avec une méthode : un moment où elle donne un signal d'achat peu après le départ (sinon l'exercice serait vide)
      const pick = method === 'none' ? pickStart(data.length) : pickStartWithSignal(data.length, runMethod(method, data).buy)
      if (!pick) throw new Error('Pas assez de données pour cette paire / durée de bougie : choisis des bougies plus longues.')
      setCandles(data)
      setSim(createSim(pick.start, pick.end))
      setSession((n) => n + 1)
      setAuto(false)
      setReveal(false)
      credited.current = { trade: false, attempt: false }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }
  const lastLoad = useRef({ pair: '', tf: 0 })

  // lecture automatique
  useEffect(() => {
    if (!auto || !sim || sim.finished || !candles) return
    const id = setInterval(() => setSim((s) => (s && candles ? advance(s, candles, 1) : s)), 650)
    return () => clearInterval(id)
  }, [auto, sim?.finished, candles]) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = sim && method !== 'none' ? trialSteps(sim) : null
  const summary = sim && candles ? summarize(sim, candles) : null

  // la progression est créditée une seule fois par exercice
  useEffect(() => {
    if (method === 'none' || !steps?.closed || credited.current.trade) return
    credited.current.trade = true
    completeTrade(method)
  }, [steps?.closed]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (method === 'none' || !sim?.finished || !summary || credited.current.attempt) return
    credited.current.attempt = true
    recordAttempt(method, summary.resultPct)
  }, [sim?.finished]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (sim?.finished) setAuto(false) }, [sim?.finished])

  // ---------- phase de préparation ----------
  if (!sim || !candles) {
    return (
      <Card title="À toi de jouer" icon={Play}>
        <div className={css.prose}>
          <p>{instruction}</p>
          <p className="t-mu">
            On te donne un <b>vrai moment passé du marché</b>, tiré au hasard : tu vois ce qui précède, jamais la suite. Tu avances bougie par bougie et tu décides.
            {method !== 'none' && <> Pour cette méthode, on choisit un moment où <b>un signal d&apos;achat apparaît</b> peu après le départ.</>}
            {' '}Tout est <b>simulé</b> avec {fm(START_CASH, 0)} € fictifs : aucun argent réel, aucun ordre envoyé.
          </p>
        </div>
        <Field label="Crypto"><select value={pair} onChange={(e) => setPair(e.target.value)}>{LEARN_PAIRS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Durée d'une bougie"><select value={tf} onChange={(e) => setTf(Number(e.target.value))}>{LEARN_TFS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
        <div className="row"><Button onClick={() => void start()} disabled={loading}>{loading ? 'Chargement…' : 'Démarrer l’exercice'}</Button></div>
        {error && <div className="notice error">{error}</div>}
      </Card>
    )
  }

  // ---------- exercice ----------
  const shownEnd = reveal ? Math.min(candles.length - 1, sim.end + REVEAL_EXTRA) : sim.cursor
  const visible = candles.slice(0, shownEnd + 1)
  const pos = sim.position
  const px = candles[sim.cursor].close
  const pnlPct = pos ? (px / pos.entry - 1) * 100 : null
  const progress = Math.round(((sim.cursor - sim.start) / (sim.end - sim.start)) * 100)

  const markers: ChartMarker[] = []
  if (guide && run) {
    for (let i = Math.max(1, sim.start - 90); i <= sim.cursor; i++) {
      if (run.buy[i] && !run.buy[i - 1]) markers.push({ time: candles[i].time, position: 'belowBar', color: '#3ddc84', shape: 'circle', text: '' })
      if (run.sell[i] && !run.sell[i - 1]) markers.push({ time: candles[i].time, position: 'aboveBar', color: '#ff4d4d', shape: 'circle', text: '' })
    }
  }
  for (const t of sim.trades) markers.push({ time: t.time, position: t.side === 'BUY' ? 'belowBar' : 'aboveBar', color: '#ff7a1a', shape: t.side === 'BUY' ? 'arrowUp' : 'arrowDown', text: t.side === 'BUY' ? 'ACHAT' : 'VENTE' })
  const levels: PriceLevel[] = pos ? [
    { price: pos.entry, color: '#d4d0c0', title: 'ton achat' },
    ...(pos.sl ? [{ price: pos.sl, color: '#ff4d4d', title: 'stop loss' }] : []),
    ...(pos.tp ? [{ price: pos.tp, color: '#3ddc84', title: 'objectif' }] : []),
  ] : []

  const advice = coach({
    method: meta, signalBuy: !!run?.buy[sim.cursor], signalSell: !!run?.sell[sim.cursor], info: run?.info[sim.cursor] ?? '',
    hasPosition: !!pos, positionHasStop: !!pos?.sl, pnlPct, finished: sim.finished,
  })

  const act = (fn: (s: Sim) => Sim) => setSim((s) => (s ? fn(s) : s))
  const next = (n: number) => act((s) => advance(s, candles, n))
  // saute jusqu'au prochain moment utile : signal d'achat si on n'a rien, signal de vente si on est en position
  const toSignal = () => act((s) => advanceUntil(s, candles, (c) => (c.position ? !!run?.sell[c.cursor] : !!run?.buy[c.cursor])))

  return (
    <div>
      <div className={css.arena}>
        <div>
          <div className={css.chartBox}>
            <ReplayChart key={session} candles={visible} lines={run?.lines} sub={run?.sub} markers={markers} levels={levels} window={reveal ? 170 : 110} />
          </div>
          <div className={css.legend}>
            {run && guide && <><span className="t-ok">●</span> signal d&apos;achat de la méthode · <span className="t-ko">●</span> signal de vente · </>}
            <span className="t-ac">▲▼</span> tes achats / ventes · lignes pointillées = ton prix d&apos;achat, ton stop et ton objectif
          </div>
          <div className="row">
            <Button variant={run ? 'sec' : 'primary'} onClick={() => { setAuto(false); next(1) }} disabled={sim.finished}><StepForward className="ic mr" />Bougie suivante</Button>
            {run && <Button onClick={() => { setAuto(false); toSignal() }} disabled={sim.finished}><SkipForward className="ic mr" />{pos ? 'Aller au signal de vente' : 'Aller au prochain signal'}</Button>}
            <Button variant="sec" onClick={() => { setAuto(false); next(5) }} disabled={sim.finished}><FastForward className="ic mr" />+5 bougies</Button>
            <Button variant="sec" onClick={() => setAuto((a) => !a)} disabled={sim.finished}>{auto ? <><Pause className="ic mr" />Pause</> : <><Play className="ic f mr" />Lecture auto</>}</Button>
            <span className="small t-mu" style={{ marginLeft: 'auto' }}>Bougie {sim.cursor - sim.start} / {sim.end - sim.start} · {EXERCISE_LEN} bougies pour cet exercice</span>
          </div>
          <div className={css.bar} style={{ marginTop: 8 }}><i style={{ width: `${progress}%` }} /></div>
          {run && (
            <label className="check" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
              <span>Montrer les signaux de la méthode sur le graphique <small>(décoche pour t&apos;entraîner « sans filet »)</small></span>
            </label>
          )}
        </div>

        <div className={css.side}>
          <div className={`${css.coach} ${css[advice.tone]}`}><div className={css.coachTitle}>{advice.title}</div><RichText text={advice.text} /></div>

          {method !== 'none' && (
            <Card title="Ta liste de validation" icon={Check}>
              <Checklist record={trial} steps={steps} />
            </Card>
          )}

          <Card title="Ton portefeuille (fictif)" icon={Play}>
            <div className={css.kv}>
              <span>Valeur totale</span><b>{fm(equity(sim, candles), 2)} €</b>
              <span>Disponible</span><b>{fm(sim.cash, 2)} €</b>
              <span>Position</span><b>{pos ? `${fm(pos.qty, 5)} @ ${fm(pos.entry, 2)}` : 'aucune'}</b>
              {pnlPct != null && (<><span>Gain / perte</span><b className={pnlPct >= 0 ? 't-ok' : 't-ko'}>{signed(pnlPct)} %</b></>)}
            </div>
            {!sim.finished && (
              <>
                <div className="hint" style={{ marginTop: 10 }}>Acheter au prix actuel ({fm(px, 2)}) :</div>
                {!pos && (
                  <>
                    <Field label="Part du capital">
                      <select value={amount} onChange={(e) => setAmount(Number(e.target.value))}>{[0.25, 0.5, 1].map((a) => <option key={a} value={a}>{a * 100} %</option>)}</select>
                    </Field>
                    <Field label="Stop loss" tip="Si le prix perd ce pourcentage depuis ton achat, tu es vendu automatiquement. Choisis-le AVANT d'acheter.">
                      <select value={sl} onChange={(e) => setSl(Number(e.target.value))}>{SL_OPTIONS.map((s) => <option key={s} value={s}>{s === 0 ? 'Aucun (déconseillé)' : `−${s} %`}</option>)}</select>
                    </Field>
                    <Field label="Objectif" tip="Si le gain atteint ce pourcentage, tu es vendu automatiquement. « Aucun » = tu vends toi-même ou sur signal.">
                      <select value={tp} onChange={(e) => setTp(Number(e.target.value))}>{TP_OPTIONS.map((s) => <option key={s} value={s}>{s === 0 ? 'Aucun' : `+${s} %`}</option>)}</select>
                    </Field>
                  </>
                )}
                <div className="row">
                  <Button className="buy" onClick={() => act((s) => buy(s, candles, amount, sl, tp, run ? !!run.buy[s.cursor] : null))} disabled={!!pos}>Acheter</Button>
                  <Button variant="ko" onClick={() => act((s) => sell(s, candles))} disabled={!pos}>Vendre</Button>
                  <Button variant="sec" onClick={() => act((s) => finish(s, candles))}>Terminer</Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {sim.finished && summary && (
        <Debrief sim={sim} summary={summary} validated={isValidated(trial)} isTrial={method !== 'none'} revealed={reveal}
          onReveal={() => setReveal(true)} onAgain={() => void start()} />
      )}
    </div>
  )
}

function Debrief({ sim, summary, validated, isTrial, revealed, onReveal, onAgain }: {
  sim: Sim; summary: ReturnType<typeof summarize>; validated: boolean; isTrial: boolean; revealed: boolean; onReveal: () => void; onAgain: () => void
}) {
  const beat = summary.resultPct > summary.buyHoldPct
  return (
    <div style={{ marginTop: 16 }}>
      <Card title="Bilan de l'exercice" icon={Check}>
        {isTrial && validated && <p className={css.badge}>✔ ÉPREUVE VALIDÉE</p>}
        <div className={css.stats}>
          <div className={css.stat}><small>Ton résultat</small><b className={summary.resultPct >= 0 ? 't-ok' : 't-ko'}>{signed(summary.resultPct)} %</b></div>
          <div className={css.stat}><small>« Acheter et attendre »</small><b className={summary.buyHoldPct >= 0 ? 't-ok' : 't-ko'}>{signed(summary.buyHoldPct)} %</b></div>
          <div className={css.stat}><small>Trades gagnants</small><b>{summary.wins} / {summary.sells}</b></div>
        </div>
        <div className={css.prose}>
          <ul>
            <li>{beat ? `Bravo : tu as fait mieux que si tu avais simplement acheté au début et attendu.` : `Le simple fait d'acheter au début et d'attendre aurait fait aussi bien ou mieux. C'est fréquent et c'est une vraie leçon : une méthode n'a d'intérêt que si elle fait mieux que « ne rien faire », ou si elle t'évite de grosses baisses.`}</li>
            {summary.buys === 0 && <li>Tu n'as passé aucun trade. Parfois c'est sage, mais pour t'entraîner il faut un trade complet : recommence.</li>}
            {summary.buys > 0 && isTrial && <li>{summary.followed} achat(s) sur {summary.buys} suivaient le signal de la méthode.{summary.followed < summary.buys && ` Acheter sans signal, c'est parier : la méthode n'y est plus pour rien.`}</li>}
            {sim.trades.some((t) => t.why.startsWith('stop loss')) && <li>Ton stop loss s'est déclenché : c'est son rôle. Il a limité la perte au lieu de la laisser grossir.</li>}
            {isTrial && !validated && <li>L&apos;épreuve n&apos;est pas encore validée : regarde ta liste de validation (quiz de la leçon + un trade acheté sur signal, avec stop loss, puis clôturé).</li>}
          </ul>
        </div>
        {sim.trades.length > 0 && (
          <table>
            <thead><tr><th>Bougie</th><th /><th>Prix</th><th>Gain / perte</th><th>Raison</th>{isTrial && <th>Suivait le signal ?</th>}</tr></thead>
            <tbody>
              {sim.trades.map((t, i) => (
                <tr key={i}>
                  <td>{t.index - sim.start}</td>
                  <td className={t.side === 'BUY' ? 't-ok' : 't-ko'}>{t.side === 'BUY' ? 'ACHAT' : 'VENTE'}</td>
                  <td>{fm(t.price, 2)}</td>
                  <td>{t.pnl == null ? '' : <span className={t.pnl >= 0 ? 't-ok' : 't-ko'}>{signed(t.pnl)} €</span>}</td>
                  <td className="t-mu">{t.why}{t.side === 'BUY' && t.withStop === false ? ' · sans stop' : ''}</td>
                  {isTrial && <td>{t.side === 'BUY' ? (t.followedSignal ? '✔ oui' : '✘ non') : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="row">
          <Button onClick={onAgain}>Rejouer un autre moment</Button>
          {!revealed && <Button variant="sec" onClick={onReveal}>Voir ce qui s&apos;est passé ensuite</Button>}
        </div>
      </Card>
    </div>
  )
}
