import { useEffect, useRef } from 'react'
import { CHART_REFRESH_MS, POLL_MS } from '@/lib/constants'
import { useBotStore } from '@/stores/botStore'
import { useMarketStore } from '@/stores/marketStore'
import { usePolling } from './usePolling'

/**
 * Orchestre la page « Bot simple » : sondage du statut, rafraîchissement du graphique, et recharge du
 * tableau/graphique quand la méthode enregistrée change ou qu'un trade vient d'être passé.
 */
export function useBotSync() {
  const refresh = useBotStore((s) => s.refresh)
  const strategy = useBotStore((s) => s.status?.config.strategy)
  const tradeSig = useBotStore((s) => {
    const st = s.status?.state
    return st ? `${st.trades.length}|${st.trades[0]?.ts ?? ''}|${st.qty}` : null
  })
  const { loadScan, loadChart } = useMarketStore.getState()

  useEffect(() => {
    void loadScan()
    void refresh().then(loadChart)
  }, [refresh, loadScan, loadChart])

  usePolling(refresh, POLL_MS, false)
  usePolling(loadChart, CHART_REFRESH_MS, false)

  const prevStrategy = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (prevStrategy.current !== undefined && strategy && prevStrategy.current !== strategy) {
      void loadScan()
      void loadChart()
    }
    if (strategy) prevStrategy.current = strategy
  }, [strategy, loadScan, loadChart])

  const prevSig = useRef<string | null>(null)
  useEffect(() => {
    if (prevSig.current !== null && tradeSig !== null && prevSig.current !== tradeSig) {
      void loadChart()
      void loadScan()
    }
    if (tradeSig !== null) prevSig.current = tradeSig
  }, [tradeSig, loadScan, loadChart])
}
