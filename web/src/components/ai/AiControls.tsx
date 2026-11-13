import { LogOut, Play, Power, RefreshCw, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { mmss } from '@/lib/format'
import type { AiStatus } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'
import { confirmAction } from '@/stores/uiStore'

/** Bloc « Contrôles » du Bot IA : un seul de Démarrer / Stop à la fois, analyse immédiate, liquidation, reset, et prochaine analyse. */
export function AiControls({ status }: { status: AiStatus }) {
  const control = useAiStore((s) => s.control)
  const { running, reviewing, next_review_s, usage } = status
  const live = status.config.mode === 'live'
  const liquidate = async () => {
    const ok = await confirmAction({
      title: 'Tout liquider ?', danger: true, confirmLabel: 'Tout liquider',
      message: `Toutes les positions du bot IA seront fermées au marché maintenant.${live ? '\nMODE LIVE : ordres réels sur Kraken.' : ''}`,
    })
    if (ok) await control('liquidate')
  }
  const reset = async () => {
    const ok = await confirmAction({
      title: 'Réinitialiser le bot IA ?', danger: true, confirmLabel: 'Réinitialiser',
      message: "Le portefeuille paper et l'historique du bot IA seront effacés. Cette action est irréversible.",
    })
    if (ok) await control('reset')
  }
  const tokens = `Tokens du jour : ${usage.in} entrée / ${usage.out} sortie`
  return (
    <Card title="Contrôles" icon={Power}>
      <div className="row">
        {!running && <Button onClick={() => void control('start')}><Play className="ic f mr" />Démarrer</Button>}
        {running && <Button variant="ko" onClick={() => void control('stop')}><Square className="ic f mr" />Stop</Button>}
        <Button variant="sec" disabled={reviewing} onClick={() => void control('analyze')}><RefreshCw className="ic mr" />Analyser maintenant</Button>
      </div>
      <div className="row">
        <Button variant="sec" onClick={() => void liquidate()}>
          <LogOut className="ic mr" />Tout liquider
        </Button>
        <Button variant="sec" onClick={() => void reset()}>
          Reset paper
        </Button>
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        {running && next_review_s != null ? `Prochaine analyse dans ${mmss(next_review_s)} · ${tokens}` : tokens}
      </div>
    </Card>
  )
}
