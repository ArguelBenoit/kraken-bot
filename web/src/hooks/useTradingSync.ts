import { useEffect } from 'react'
import { CHART_REFRESH_MS, POLL_MS } from '@/lib/constants'
import { useManualStore } from '@/stores/manualStore'
import { useMarketStore } from '@/stores/marketStore'
import { usePolling } from './usePolling'

/** Page Trading : sondage du portefeuille (3 s) et du graphique (60 s) ; le graphique suit la paire du ticket. */
export function useTradingSync() {
  const refresh = useManualStore((s) => s.refresh)
  const pair = useManualStore((s) => s.ticket.pair)
  const { loadScan, loadChart, selectPair } = useMarketStore.getState()

  useEffect(() => {
    void loadScan()
  }, [loadScan])

  usePolling(refresh, POLL_MS)
  usePolling(loadChart, CHART_REFRESH_MS, false)

  useEffect(() => {
    if (useMarketStore.getState().view?.pair !== pair || !useMarketStore.getState().chart) selectPair(pair)
    void refresh()
  }, [pair, selectPair, refresh])
}
