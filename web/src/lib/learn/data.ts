import { api } from '@/lib/api'
import type { ChartData } from '@/lib/types'
import type { Candle } from './methods'

/** Bougies historiques d'une paire (jusqu'à 720, la dernière — en cours de formation — est écartée). Lecture seule : aucun ordre n'est jamais passé. */
export async function fetchCandles(pair: string, tf: number): Promise<Candle[]> {
  const d = await api.get<ChartData>(`/api/chart?pair=${pair}&tf=${tf}`)
  return d.candles.slice(0, -1).map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
}

/** Paires proposées aux exercices (les plus liquides). */
export const LEARN_PAIRS: [string, string][] = [
  ['XBTUSDC', 'Bitcoin (BTC)'], ['ETHUSDC', 'Ethereum (ETH)'], ['SOLUSDC', 'Solana (SOL)'], ['XRPUSDC', 'Ripple (XRP)'],
  ['ADAUSDC', 'Cardano (ADA)'], ['LINKUSDC', 'Chainlink (LINK)'], ['XDGUSDC', 'Dogecoin (DOGE)'],
]
/** Durées de bougie proposées aux exercices, en langage simple. */
export const LEARN_TFS = [
  { value: 60, label: 'Bougies de 1 heure' },
  { value: 240, label: 'Bougies de 4 heures (recommandé)' },
  { value: 1440, label: 'Bougies de 1 jour' },
]
