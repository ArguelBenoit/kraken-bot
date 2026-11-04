import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fm, signed } from '@/lib/format'
import type { AiPosition } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'

const dp = (p: number) => (p < 1 ? 6 : 2)
const tone = (v: number) => (v >= 0 ? 't-ok' : 't-ko')

export function PositionsCard({ positions }: { positions: AiPosition[] }) {
  const close = useAiStore((s) => s.closePosition)
  return (
    <Card title="Positions ouvertes" icon={Zap}>
      {positions.length === 0 ? (
        <span className="t-mu">Aucune position ouverte.</span>
      ) : (
        <table>
          <thead>
            <tr><th>Paire</th><th>Stratégie</th><th>Entrée</th><th>Prix</th><th>PnL</th><th>SL/TP/Suiv.</th><th /></tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <FragmentRows key={p.id} p={p} onClose={() => window.confirm('Fermer cette position au marché ?') && void close(p.id)} />
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function FragmentRows({ p, onClose }: { p: AiPosition; onClose: () => void }) {
  return (
    <>
      <tr>
        <td><b>{p.label}</b><br /><small className="t-mu">{p.opened} · conf {fm(p.conf)}</small></td>
        <td>{p.strategy}</td>
        <td>{fm(p.entry, dp(p.entry))}</td>
        <td>{fm(p.price, dp(p.price))}</td>
        <td><span className={tone(p.pnl_pct)}>{signed(p.pnl_pct)}%</span><br /><span className={tone(p.pnl)}>{signed(p.pnl)}</span></td>
        <td>−{p.sl}% / {p.tp ? `+${p.tp}%` : '–'} / {p.trail ? `${p.trail}%` : '–'}</td>
        <td><Button variant="ko" onClick={onClose}>Fermer</Button></td>
      </tr>
      <tr><td colSpan={7} className="t-mu" style={{ fontSize: 12 }}>{p.reason}</td></tr>
    </>
  )
}
