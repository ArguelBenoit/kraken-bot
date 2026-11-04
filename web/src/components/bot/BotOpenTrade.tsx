import { LogOut } from 'lucide-react'
import { OpenTradeCard } from '@/components/trade/OpenTradeCard'
import { Button } from '@/components/ui/Button'
import { fm } from '@/lib/format'
import { pairLabel } from '@/lib/constants'
import { botTradeInput, exitRule } from '@/lib/trade'
import { useBotStore } from '@/stores/botStore'

/** Trade en cours du Bot simple : masqué sans position. */
export function BotOpenTrade() {
  const status = useBotStore((s) => s.status)
  const control = useBotStore((s) => s.control)
  if (!status || !status.state.qty) return null
  const { state: st, config: c } = status

  const liquidate = () => {
    const live = c.mode === 'live' ? '\nMODE LIVE : ordre réel sur Kraken.' : ''
    if (window.confirm(`Vendre toute la position au prix du marché maintenant ?${live}`)) void control('liquidate')
  }

  const info = (
    <>
      {c.strategy === 'trend' && <>EMA{c.ma_fast} <b>{st.pos_ma ? fm(st.pos_ma.fast, 2) : '–'}</b> / EMA{c.ma_slow} <b>{st.pos_ma ? fm(st.pos_ma.slow, 2) : '–'}</b> · </>}
      {c.strategy === 'rsi' && <>RSI actuel <b>{st.pos_rsi == null ? '–' : fm(st.pos_rsi, 1)}</b> · </>}
      {exitRule(c)}
    </>
  )

  return (
    <OpenTradeCard
      pair={pairLabel(st.pair ?? c.pair)}
      input={botTradeInput(st, c)}
      info={info}
      actions={
        <Button variant="ko" size="title" onClick={liquidate}>
          <LogOut className="ic mr" />
          Liquider la position
        </Button>
      }
    />
  )
}
