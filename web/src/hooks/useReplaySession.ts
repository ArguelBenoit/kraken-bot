import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchCandles } from '@/lib/learn/data'
import { runMethod, type Candle, type MethodId } from '@/lib/learn/methods'
import {
  advance, advanceUntil, buy, createSim, finish, pickStart, pickStartWithSignal, sell, summarize, type Sim,
} from '@/lib/learn/sim'
import { trialSteps } from '@/lib/learn/trials'
import { useLearnStore } from '@/stores/learnStore'

const AUTO_PLAY_MS = 650

/**
 * Une session d'exercice de replay : chargement des bougies, tirage d'un moment passé, avancée bougie par bougie (manuelle ou
 * automatique), achats / ventes simulés, et crédit de la progression (épreuve) une seule fois par exercice.
 */
export function useReplaySession(method: MethodId | 'none', initialPair: string, initialTf: number) {
  const [pair, setPair] = useState(initialPair)
  const [tf, setTf] = useState(initialTf)
  const [candles, setCandles] = useState<Candle[] | null>(null)
  const [sim, setSim] = useState<Sim | null>(null)
  const [session, setSession] = useState(0)            // change à chaque nouvel exercice : remonte le graphique
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [auto, setAuto] = useState(false)
  const [reveal, setReveal] = useState(false)
  const loaded = useRef({ pair: '', tf: 0 })           // dernières bougies chargées (évite de les retélécharger)
  const credited = useRef({ trade: false, attempt: false })

  const run = useMemo(() => (candles && method !== 'none' ? runMethod(method, candles) : null), [candles, method])
  const steps = sim && method !== 'none' ? trialSteps(sim) : null
  const summary = sim && candles ? summarize(sim, candles) : null

  /** Démarre un nouvel exercice à un moment tiré au hasard. */
  const start = async () => {
    setLoading(true)
    setError('')
    try {
      const reuse = candles && pair === loaded.current.pair && tf === loaded.current.tf
      const data = reuse ? candles : await fetchCandles(pair, tf)
      loaded.current = { pair, tf }
      // avec une méthode : un moment où elle donne un signal d'achat peu après le départ (sinon l'exercice serait vide)
      const pick = method === 'none' ? pickStart(data.length) : pickStartWithSignal(data.length, runMethod(method, data).buy)
      if (!pick) throw new Error('Pas assez de données pour cette paire / durée de bougie : choisis des bougies plus longues.')
      setCandles(data)
      setSim(createSim(pick.start, pick.end))
      setSession((n) => n + 1)
      setAuto(false)
      setReveal(false)
      credited.current = { trade: false, attempt: false }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // lecture automatique : une bougie à intervalle régulier, jusqu'à la fin de l'exercice
  useEffect(() => {
    if (!auto || !candles || sim?.finished) return
    const id = setInterval(() => setSim((s) => (s ? advance(s, candles, 1) : s)), AUTO_PLAY_MS)
    return () => clearInterval(id)
  }, [auto, sim?.finished, candles])

  // la progression est créditée une seule fois par exercice : trade modèle terminé, puis tentative enregistrée à la fin
  useEffect(() => {
    if (method === 'none' || !steps?.closed || credited.current.trade) return
    credited.current.trade = true
    void useLearnStore.getState().completeTrade(method)
  }, [method, steps?.closed])
  useEffect(() => {
    if (!sim?.finished) return
    setAuto(false)
    if (method === 'none' || !summary || credited.current.attempt) return
    credited.current.attempt = true
    void useLearnStore.getState().recordAttempt(method, summary.resultPct)
  }, [method, sim?.finished, summary])

  /** Applique une action du simulateur à l'état courant. */
  const act = (fn: (s: Sim, c: Candle[]) => Sim) => candles && setSim((s) => (s ? fn(s, candles) : s))

  return {
    pair, setPair, tf, setTf, candles, sim, session, loading, error, auto, reveal, run, steps, summary, start,
    step: (n: number) => { setAuto(false); act((s, c) => advance(s, c, n)) },
    /** Saute jusqu'au prochain moment utile : signal d'achat si on n'a rien, signal de vente si on est en position. */
    jumpToSignal: () => {
      setAuto(false)
      act((s, c) => advanceUntil(s, c, (x) => (x.position ? !!run?.sell[x.cursor] : !!run?.buy[x.cursor])))
    },
    toggleAuto: () => setAuto((a) => !a),
    revealRest: () => setReveal(true),
    buy: (share: number, stopPct: number, targetPct: number) =>
      act((s, c) => buy(s, c, share, stopPct, targetPct, run ? !!run.buy[s.cursor] : null)),
    sell: () => act((s, c) => sell(s, c)),
    finish: () => act((s, c) => finish(s, c)),
  }
}
