import { FastForward, Pause, Play, SkipForward, StepForward } from 'lucide-react'
import type { ChartLevel, ChartMarker } from '@/lib/chartTypes'
import { Button } from '@/components/ui/Button'
import type { Candle, MethodRun } from '@/lib/learn/methods'
import { EXERCISE_LEN, type Sim } from '@/lib/learn/sim'
import css from './Learn.module.css'
import { ReplayChart } from './ReplayChart'

const REVEAL_EXTRA = 40        // bougies montrées en plus après la fin quand on demande « ce qui s'est passé ensuite »

interface Props {
  sim: Sim
  /** Toutes les bougies chargées : seules celles déjà « jouées » (ou la suite révélée) sont passées au graphique. */
  candles: Candle[]
  run: MethodRun | null
  session: number
  reveal: boolean
  auto: boolean
  guide: boolean
  markers: ChartMarker[]
  levels: ChartLevel[]
  onStep: (n: number) => void
  onJump: () => void
  onToggleAuto: () => void
  onGuide: (on: boolean) => void
}

/** Plateau de l'exercice : graphique, légende, boutons d'avancée dans le temps et barre de progression. */
export function ReplayStage({ sim, candles, run, session, reveal, auto, guide, markers, levels, onStep, onJump, onToggleAuto, onGuide }: Props) {
  const shownEnd = reveal ? Math.min(candles.length - 1, sim.end + REVEAL_EXTRA) : sim.cursor
  const progress = Math.round(((sim.cursor - sim.start) / (sim.end - sim.start)) * 100)
  return (
    <div>
      <div className={css.chartBox}>
        <ReplayChart key={session} candles={candles.slice(0, shownEnd + 1)} lines={run?.lines} sub={run?.sub} markers={markers} levels={levels} window={reveal ? 170 : 110} />
      </div>
      <div className={css.legend}>
        {run && guide && <><span className="t-ok">●</span> signal d&apos;achat de la méthode · <span className="t-ko">●</span> signal de vente · </>}
        <span className="t-ac">▲▼</span> tes achats / ventes · lignes pointillées = ton prix d&apos;achat, ton stop et ton objectif
      </div>
      <div className="row">
        <Button variant={run ? 'sec' : 'primary'} onClick={() => onStep(1)} disabled={sim.finished}><StepForward className="ic mr" />Bougie suivante</Button>
        {run && (
          <Button onClick={onJump} disabled={sim.finished}>
            <SkipForward className="ic mr" />{sim.position ? 'Aller au signal de vente' : 'Aller au prochain signal'}
          </Button>
        )}
        <Button variant="sec" onClick={() => onStep(5)} disabled={sim.finished}><FastForward className="ic mr" />+5 bougies</Button>
        <Button variant="sec" onClick={onToggleAuto} disabled={sim.finished}>
          {auto ? <><Pause className="ic mr" />Pause</> : <><Play className="ic f mr" />Lecture auto</>}
        </Button>
        <span className="small t-mu" style={{ marginLeft: 'auto' }}>Bougie {sim.cursor - sim.start} / {sim.end - sim.start} · {EXERCISE_LEN} bougies pour cet exercice</span>
      </div>
      <div className={css.bar} style={{ marginTop: 8 }}><i style={{ width: `${progress}%` }} /></div>
      {run && (
        <label className="check" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={guide} onChange={(e) => onGuide(e.target.checked)} />
          <span>Montrer les signaux de la méthode sur le graphique <small>(décoche pour t&apos;entraîner « sans filet »)</small></span>
        </label>
      )}
    </div>
  )
}
