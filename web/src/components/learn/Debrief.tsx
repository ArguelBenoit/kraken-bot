import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fm, gainClass, sideClass, signed } from '@/lib/format'
import type { Sim, Summary } from '@/lib/learn/sim'
import css from './Learn.module.css'

interface Props {
  sim: Sim
  summary: Summary
  /** Exercice d'une épreuve (méthode) : on commente aussi le respect du signal. */
  isTrial: boolean
  validated: boolean
  revealed: boolean
  onReveal: () => void
  onAgain: () => void
}

/** Bilan de fin d'exercice : résultat comparé à « acheter et attendre », respect de la méthode, détail des trades. */
export function Debrief({ sim, summary, isTrial, validated, revealed, onReveal, onAgain }: Props) {
  const beat = summary.resultPct > summary.buyHoldPct
  const stopped = sim.trades.some((t) => t.why.startsWith('stop loss'))
  return (
    <div style={{ marginTop: 16 }}>
      <Card title="Bilan de l'exercice" icon={Check}>
        {isTrial && validated && <p className={css.badge}>✔ ÉPREUVE VALIDÉE</p>}
        <div className={css.stats}>
          <div className={css.stat}><small>Ton résultat</small><b className={gainClass(summary.resultPct)}>{signed(summary.resultPct)} %</b></div>
          <div className={css.stat}><small>« Acheter et attendre »</small><b className={gainClass(summary.buyHoldPct)}>{signed(summary.buyHoldPct)} %</b></div>
          <div className={css.stat}><small>Trades gagnants</small><b>{summary.wins} / {summary.sells}</b></div>
        </div>
        <div className={css.prose}>
          <ul>
            <li>
              {beat
                ? 'Bravo : tu as fait mieux que si tu avais simplement acheté au début et attendu.'
                : "Le simple fait d'acheter au début et d'attendre aurait fait aussi bien ou mieux. C'est fréquent et c'est une vraie leçon : une méthode n'a d'intérêt que si elle fait mieux que « ne rien faire », ou si elle t'évite de grosses baisses."}
            </li>
            {summary.buys === 0 && <li>Tu n&apos;as passé aucun trade. Parfois c&apos;est sage, mais pour t&apos;entraîner il faut un trade complet : recommence.</li>}
            {summary.buys > 0 && isTrial && (
              <li>
                {summary.followed} achat(s) sur {summary.buys} suivaient le signal de la méthode.
                {summary.followed < summary.buys && " Acheter sans signal, c'est parier : la méthode n'y est plus pour rien."}
              </li>
            )}
            {stopped && <li>Ton stop loss s&apos;est déclenché : c&apos;est son rôle. Il a limité la perte au lieu de la laisser grossir.</li>}
            {isTrial && !validated && <li>L&apos;épreuve n&apos;est pas encore validée : regarde ta liste de validation (quiz de la leçon + un trade acheté sur signal, avec stop loss, puis clôturé).</li>}
          </ul>
        </div>
        {sim.trades.length > 0 && (
          <table>
            <thead><tr><th>Bougie</th><th /><th>Prix</th><th>Gain / perte</th><th>Raison</th>{isTrial && <th>Suivait le signal ?</th>}</tr></thead>
            <tbody>
              {sim.trades.map((t, i) => (
                <tr key={i}>
                  <td>{t.index - sim.start}</td>
                  <td className={sideClass(t.side)}>{t.side === 'BUY' ? 'ACHAT' : 'VENTE'}</td>
                  <td>{fm(t.price, 2)}</td>
                  <td>{t.pnl != null && <span className={gainClass(t.pnl)}>{signed(t.pnl)} €</span>}</td>
                  <td className="t-mu">{t.why}{t.side === 'BUY' && t.withStop === false ? ' · sans stop' : ''}</td>
                  {isTrial && <td>{t.side === 'BUY' ? (t.followedSignal ? '✔ oui' : '✘ non') : ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="row">
          <Button onClick={onAgain}>Rejouer un autre moment</Button>
          {!revealed && <Button variant="sec" onClick={onReveal}>Voir ce qui s&apos;est passé ensuite</Button>}
        </div>
      </Card>
    </div>
  )
}
