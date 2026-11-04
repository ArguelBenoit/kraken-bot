import { LogOut } from 'lucide-react'
import { OpenTradeCard } from '@/components/trade/OpenTradeCard'
import { Button } from '@/components/ui/Button'
import { fm } from '@/lib/format'
import { aiTradeInput } from '@/lib/trade'
import type { AiPosition } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'

/** Un « Trade en cours » par position ouverte par Claude (jusqu'à 5). Rien n'est affiché sans position. */
export function AiOpenTrades({ positions, feePct }: { positions: AiPosition[]; feePct: number }) {
  const close = useAiStore((s) => s.closePosition)
  return (
    <>
      {positions.map((p) => (
        <OpenTradeCard
          key={p.id}
          pair={p.label}
          input={aiTradeInput(p, feePct)}
          info={
            <>
              <b>{p.strategy}</b> · confiance {fm(p.conf)} · ouvert le {p.opened}
              {p.trail > 0 && <> · suiveur {p.trail}%</>}
              <br />
              {p.reason}
            </>
          }
          actions={
            <Button variant="ko" size="title" onClick={() => window.confirm(`Fermer la position ${p.label} au marché ?`) && void close(p.id)}>
              <LogOut className="ic mr" />
              Fermer
            </Button>
          }
        />
      ))}
    </>
  )
}
