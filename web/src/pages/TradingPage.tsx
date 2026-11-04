import { Crosshair } from 'lucide-react'
import { useMemo } from 'react'
import { MarketCard } from '@/components/market/MarketCard'
import type { ChartLevel } from '@/lib/chartTypes'
import { Header, Kpi } from '@/components/layout/Header'
import { LogCard } from '@/components/ui/LogCard'
import { ModeSwitch } from '@/components/ui/ModeSwitch'
import { PairTradesCard } from '@/components/ui/PairTradesCard'
import { ManualSettingsCard } from '@/components/trading/ManualSettingsCard'
import { OrderTicketCard } from '@/components/trading/OrderTicketCard'
import { ManualOpenTrades } from '@/components/trading/ManualOpenTrades'
import { PendingOrdersCard } from '@/components/trading/PendingOrdersCard'
import { useTradingSync } from '@/hooks/useTradingSync'
import { fm, gainClass, signed } from '@/lib/format'
import { previewTicket } from '@/lib/ticket'
import { useManualStore } from '@/stores/manualStore'
import { useMarketStore } from '@/stores/marketStore'

/** Lignes du graphique : positions ouvertes + ordres limites + aperçu de l'ordre en cours de saisie. */
function useChartLevels(): ChartLevel[] {
  const status = useManualStore((s) => s.status)
  const t = useManualStore((s) => s.ticket)
  const chartPair = useMarketStore((s) => s.chart?.pair)
  return useMemo(() => {
    if (!chartPair || !status) return []
    const out: ChartLevel[] = []
    for (const p of status.positions.filter((x) => x.pair === chartPair)) {
      out.push({ price: p.entry, color: '#d4d0c0', title: 'achat' })
      if (p.sl_price) out.push({ price: p.sl_price, color: '#ff4d4d', title: 'SL' })
      if (p.tp_price) out.push({ price: p.tp_price, color: '#3ddc84', title: 'TP' })
      if (p.trail_price) out.push({ price: p.trail_price, color: '#ff7a1a', title: 'suiveur' })
    }
    for (const o of status.pending.filter((x) => x.pair === chartPair)) out.push({ price: o.limit, color: '#4aa3ff', title: 'limite' })
    if (t.pair === chartPair && status.quote?.pair === chartPair) {
      const pv = previewTicket({ price: status.quote.price, size: Number(t.size), feePct: status.config.fee_pct, slPct: Number(t.sl || 0), tpPct: Number(t.tp || 0), type: t.type, limitPrice: Number(t.limit) })
      if (pv?.slPrice) out.push({ price: pv.slPrice, color: '#ff4d4d88', title: 'SL (ordre)' })
      if (pv?.tpPrice) out.push({ price: pv.tpPrice, color: '#3ddc8488', title: 'TP (ordre)' })
    }
    return out
  }, [status, t, chartPair])
}

/** Page d'accueil — trading manuel : ticket d'ordre (avec les propositions de Claude), positions ouvertes, ordres en attente, marché et graphique. */
export function TradingPage() {
  useTradingSync()
  const status = useManualStore((s) => s.status)
  const setMode = useManualStore((s) => s.setMode)
  const setTicket = useManualStore((s) => s.setTicket)
  const levels = useChartLevels()
  const live = status?.config.mode === 'live'

  return (
    <>
      <Header title="Trading" icon={Crosshair}>
        <Kpi bare label="Mode" tipRight={false} tip="Paper = simulation, aucun argent engagé. LIVE = ordres réels sur ton compte Kraken (jamais testé).">
          <ModeSwitch mode={status?.config.mode ?? 'paper'} onChange={(m) => void setMode(m)} />
        </Kpi>
        <Kpi label="PnL réalisé" tip="Gains/pertes cumulés des positions déjà vendues, frais inclus.">
          <b className={gainClass(status?.pnl ?? 0)}>{fm(status?.pnl)}</b>
        </Kpi>
        <Kpi label="PnL latent" tip="Gain ou perte des positions encore ouvertes, au prix actuel, frais de vente déduits.">
          <b className={gainClass(status?.unrealized ?? 0)}>{status ? signed(status.unrealized) : '–'}</b>
        </Kpi>
        <Kpi label="Cash" tip={live ? 'Non suivi en live : voir ton solde Kraken.' : 'Stablecoin disponible (hors ordres limites en attente).'}>
          <b>{live ? 'n/a' : fm(status?.cash)}</b>
        </Kpi>
        <Kpi label="Équité" tip="Cash + valeur des positions ouvertes au prix actuel.">
          <b>{live ? 'n/a' : fm(status?.equity)}</b>
        </Kpi>
        <Kpi label="Positions" tip="Positions ouvertes. Leurs stops sont surveillés par ce programme, pas par Kraken.">
          <b>{status ? status.positions.length : '–'}</b>
        </Kpi>
      </Header>
      <main className="layout">
        <div className="col">
          <OrderTicketCard />
          <ManualSettingsCard />
          <PairTradesCard trades={status?.trades ?? []} />
          <LogCard logs={status?.logs ?? []} />
        </div>
        <div className="col">
          <ManualOpenTrades positions={status?.positions ?? []} feePct={status?.config.fee_pct ?? 0.26} live={!!live} />
          <PendingOrdersCard pending={status?.pending ?? []} />
          <MarketCard tradeLabel="Acheter" levels={levels}
            onSelect={(pair) => setTicket({ pair })} onTrade={(pair) => { setTicket({ pair }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
        </div>
      </main>
    </>
  )
}
