import { LogOut, Play, RefreshCw, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { mmss } from '@/lib/format'
import type { AiStatus } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'

/** Boutons du Bot IA : un seul de Démarrer / Stop à la fois, analyse immédiate, liquidation, reset, et prochaine analyse. */
export function AiControls({ status }: { status: AiStatus }) {
  const control = useAiStore((s) => s.control)
  const { running, reviewing, next_review_s, usage } = status
  const tokens = `Tokens du jour : ${usage.in} entrée / ${usage.out} sortie`
  return (
    <>
      <div className="row">
        {!running && <Button onClick={() => void control('start')}><Play className="ic f mr" />Démarrer</Button>}
        {running && <Button variant="ko" onClick={() => void control('stop')}><Square className="ic f mr" />Stop</Button>}
        <Button variant="sec" disabled={reviewing} onClick={() => void control('analyze')}><RefreshCw className="ic mr" />Analyser maintenant</Button>
      </div>
      <div className="row">
        <Button variant="sec" onClick={() => window.confirm('Fermer toutes les positions au marché ?') && void control('liquidate')}>
          <LogOut className="ic mr" />Tout liquider
        </Button>
        <Button variant="sec" onClick={() => window.confirm("Réinitialiser le portefeuille et l'historique du bot IA ?") && void control('reset')}>
          Reset paper
        </Button>
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        {running && next_review_s != null ? `Prochaine analyse dans ${mmss(next_review_s)} · ${tokens}` : tokens}
      </div>
    </>
  )
}
