import { LogOut } from 'lucide-react'
import { OpenTradeCard } from '@/components/trade/OpenTradeCard'
import { Button } from '@/components/ui/Button'
import { fm } from '@/lib/format'
import { aiTradeInput } from '@/lib/trade'
import type { AiPosition } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'
import { confirmAction } from '@/stores/uiStore'

/** Un « Trade en cours » par position ouverte par le modèle (jusqu'à 5). Rien n'est affiché sans position. */
export function AiOpenTrades({ positions, feePct }: { positions: AiPosition[]; feePct: number }) {
  const close = useAiStore((s) => s.closePosition)
  const closeWithConfirm = async (p: AiPosition) => {
    const ok = await confirmAction({
      title: `Fermer ${p.label} ?`, danger: true, confirmLabel: 'Fermer la position',
      message: 'La position sera vendue au prix du marché maintenant.',
    })
    if (ok) await close(p.id)
  }
  return (
    <>
      {positions.map((p) => (
        <OpenTradeCard
          key={p.id}
          pair={p.label}
          input={aiTradeInput(p, feePct)}
          details={[
            ['Stratégie', p.strategy], ['Confiance', fm(p.conf)], ['Ouvert le', p.opened],
            ['Stop loss', p.sl > 0 ? `${p.sl} %` : 'aucun'], ['Stop suiveur', p.trail > 0 ? `${p.trail} %` : 'aucun'],
            ['Objectif', p.tp > 0 ? `${p.tp} %` : 'aucun'],
            ...(p.exchange_stop != null ? [['Stop chez Kraken', p.exchange_stop ? 'posé ✓' : 'NON POSÉ'] as [string, string]] : []),
          ]}
          info={
            <>
              <b>{p.strategy}</b> · confiance {fm(p.conf)} · ouvert le {p.opened}
              {p.trail > 0 && <> · suiveur {p.trail}%</>}
              {p.exchange_stop === true && <> · <span className="t-ok">stop posé chez Kraken ✓</span></>}
              {p.exchange_stop === false && (p.sl > 0 || p.trail > 0) && <> · <b className="t-ko">STOP NON POSÉ chez Kraken</b></>}
              <br />
              {p.reason}
            </>
          }
          actions={
            <Button variant="ko" size="title" onClick={() => void closeWithConfirm(p)}>
              <LogOut className="ic mr" />
              Fermer
            </Button>
          }
        />
      ))}
    </>
  )
}
