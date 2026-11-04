import { ChartCandlestick } from 'lucide-react'
import { Header, Kpi } from '@/components/layout/Header'
import { MarketCard } from '@/components/bot/MarketCard'
import { BotOpenTrade } from '@/components/bot/BotOpenTrade'
import { SettingsCard } from '@/components/bot/SettingsCard'
import { TradesCard } from '@/components/bot/TradesCard'
import { LogCard } from '@/components/ui/LogCard'
import { ModeSwitch } from '@/components/ui/ModeSwitch'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useBotSync } from '@/hooks/useBotSync'
import { fm, gainClass } from '@/lib/format'
import { KPI_TIPS } from '@/lib/tips'
import { useBotStore } from '@/stores/botStore'

/** Page du bot simple : réglages, position en cours, tableau Marché et graphique. */
export function BotPage() {
  useBotSync()
  const status = useBotStore((s) => s.status)
  const setMode = useBotStore((s) => s.setMode)
  const paper = status?.config.mode === 'paper'
  const pnl = status?.state.pnl ?? 0

  return (
    <>
      <Header title="Bot simple" icon={ChartCandlestick}>
        <Kpi bare label="Mode" tip={KPI_TIPS['Mode']} tipRight={false}>
          <ModeSwitch mode={status?.config.mode ?? 'paper'} onChange={(m) => void setMode(m)} />
        </Kpi>
        <Kpi bare label="Statut"><StatusBadge running={!!status?.running} /></Kpi>
        <Kpi label="PnL réalisé" tip={KPI_TIPS['PnL réalisé']}>
          <b className={gainClass(pnl)}>{fm(status?.state.pnl)}</b>
        </Kpi>
        <Kpi label="Équité (paper)" tip={KPI_TIPS['Équité (paper)']} hidden={!paper}>
          <b>{fm(status?.state.equity)}</b>
        </Kpi>
      </Header>
      <main className="layout">
        <div className="col">
          <SettingsCard />
          <TradesCard trades={status?.state.trades ?? []} />
          <LogCard logs={status?.logs ?? []} />
        </div>
        <div className="col">
          <BotOpenTrade />
          <MarketCard />
        </div>
      </main>
    </>
  )
}
