import { Check } from 'lucide-react'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { useReplaySession } from '@/hooks/useReplaySession'
import { coach } from '@/lib/learn/coach'
import { METHODS, type MethodId } from '@/lib/learn/methods'
import { positionLevels, signalMarkers, tradeMarkers } from '@/lib/learn/replayView'
import { isValidated } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'
import { Checklist } from './Checklist'
import { Debrief } from './Debrief'
import css from './Learn.module.css'
import { PracticeSetup } from './PracticeSetup'
import { ReplayStage } from './ReplayStage'
import { RichText } from './RichText'
import { TradePanel } from './TradePanel'

const HISTORY_SHOWN = 90        // bougies avant le départ dont on affiche les signaux

interface Props {
  method: MethodId | 'none'
  pair: string
  tf: number
  instruction: string
}

/** Exercice de replay : un vrai moment passé du marché, révélé bougie par bougie. 100 % simulé (aucun ordre n'est envoyé nulle part). */
export function PracticeArena({ method, pair, tf, instruction }: Props) {
  const s = useReplaySession(method, pair, tf)
  const [guide, setGuide] = useState(true)
  const trial = useLearnStore((st) => (method === 'none' ? undefined : st.trials[method]))
  const meta = method === 'none' ? null : METHODS[method]

  if (!s.sim || !s.candles || !s.summary) {
    return <PracticeSetup instruction={instruction} withMethod={method !== 'none'} pair={s.pair} tf={s.tf} loading={s.loading}
      onPair={s.setPair} onTf={s.setTf} onStart={() => void s.start()} />
  }
  const { sim, candles, run } = s
  const position = sim.position
  const markers = [...(guide && run ? signalMarkers(candles, run, sim.start - HISTORY_SHOWN, sim.cursor) : []), ...tradeMarkers(sim.trades)]
  const advice = coach({
    method: meta, signalBuy: !!run?.buy[sim.cursor], signalSell: !!run?.sell[sim.cursor], info: run?.info[sim.cursor] ?? '',
    hasPosition: !!position, positionHasStop: !!position?.sl,
    pnlPct: position ? (candles[sim.cursor].close / position.entry - 1) * 100 : null, finished: sim.finished,
  })

  return (
    <div>
      <div className={css.arena}>
        <ReplayStage sim={sim} candles={candles} run={run} session={s.session} reveal={s.reveal} auto={s.auto} guide={guide}
          markers={markers} levels={positionLevels(position)} onStep={s.step} onJump={s.jumpToSignal}
          onToggleAuto={s.toggleAuto} onGuide={setGuide} />
        <div className={css.side}>
          <div className={`${css.coach} ${css[advice.tone]}`}><div className={css.coachTitle}>{advice.title}</div><RichText text={advice.text} /></div>
          {method !== 'none' && <Card title="Ta liste de validation" icon={Check}><Checklist record={trial} steps={s.steps} /></Card>}
          <TradePanel sim={sim} candles={candles} suggested={meta?.stops ?? { sl: 3, tp: 5 }} onBuy={s.buy} onSell={s.sell} onFinish={s.finish} />
        </div>
      </div>
      {sim.finished && (
        <Debrief sim={sim} summary={s.summary} isTrial={method !== 'none'} validated={isValidated(trial)} revealed={s.reveal}
          onReveal={s.revealRest} onAgain={() => void s.start()} />
      )}
    </div>
  )
}
