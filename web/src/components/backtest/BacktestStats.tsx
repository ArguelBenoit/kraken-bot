import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { fm, gainClass, signed } from '@/lib/format'
import type { BtStats } from '@/lib/types'
import css from './Backtest.module.css'

const pct = (v: number) => `${signed(v)} %`
const num = (v: number | null, d = 2) => (v == null ? '–' : fm(v, d))

/** Ligne libellé / valeur du tableau avec son explication. */
function Row({ label, tip, children }: { label: string; tip: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className={css.label}>{label}<Tip text={tip} /></td>
      <td>{children}</td>
    </tr>
  )
}

/** Chiffres d'un essai : rendement face au buy & hold, qualité des trades, risque, frais et consommation du modèle. */
export function BacktestStatsCard({ s, maxPositions }: { s: BtStats; maxPositions: number }) {
  return (
    <Card title="Résultats" icon={BarChart3}>
      <table className={css.stats}><tbody>
        <Row label="Rendement du Bot IA" tip="Variation de l'équité (cash + positions) entre le début et la fin de la période, frais compris."><b className={gainClass(s.return_pct)}>{pct(s.return_pct)}</b> ({signed(s.pnl)})</Row>
        <Row label="Buy & hold" tip="Même capital réparti à parts égales sur les paires, acheté au début et conservé. Si le bot ne fait pas mieux, il n'apporte rien."><b className={gainClass(s.hold_pct)}>{pct(s.hold_pct)}</b></Row>
        <Row label="Écart avec le buy & hold" tip="Rendement du bot moins celui du buy & hold : positif = le bot a fait mieux."><b className={gainClass(s.return_pct - s.hold_pct)}>{pct(s.return_pct - s.hold_pct)}</b></Row>
        {s.peak_pct != null && <Row label="Gain maximum (pic)" tip="Meilleur moment de la session : plus haut de l'équité par rapport au budget de départ. L'écart avec le rendement final montre ce qui a été rendu au marché."><b className={gainClass(s.peak_pct)}>{pct(s.peak_pct)}</b></Row>}
        <Row label="Drawdown max" tip="Pire baisse de l'équité depuis un sommet : ce que tu aurais vu fondre au plus bas."><b className="t-ko">{num(s.max_drawdown_pct)} %</b></Row>
        <Row label="Trades clos" tip="Nombre de positions fermées pendant la période (les positions encore ouvertes à la fin ne comptent pas ici).">{s.trades}</Row>
        {s.max_open != null && <Row label="Trades simultanés max" tip="Plus grand nombre de positions ouvertes en même temps pendant l'essai, sur la limite de trades en parallèle réglée. Si le maximum est atteint souvent, la limite bride le bot.">{s.max_open} / {maxPositions}</Row>}
        <Row label="Taux de réussite" tip="Part des trades clos gagnants. Avec des frais de 0,5 %, il faut en général plus de 45 % à 1,5 de gain/risque.">{s.win_rate == null ? '–' : `${fm(s.win_rate, 0)} % (${s.wins}/${s.trades})`}</Row>
        <Row label="Gain moyen / perte moyenne" tip="Moyenne des trades gagnants et des trades perdants (en monnaie de cotation)."><span className="t-ok">{signed(s.avg_win)}</span> / <span className="t-ko">{signed(s.avg_loss)}</span></Row>
        <Row label="Rapport gain/perte réel" tip="Gain moyen ÷ perte moyenne. Au-dessus de 1, un gagnant rapporte plus qu'un perdant ne coûte.">{num(s.payoff)}</Row>
        <Row label="Espérance par trade" tip="Gain moyen attendu par trade (frais compris) : positif = la méthode gagne en moyenne, négatif = elle perd."><b className={gainClass(s.expectancy ?? 0)}>{s.expectancy == null ? '–' : signed(s.expectancy)}</b></Row>
        <Row label="Profit factor" tip="Somme des gains ÷ somme des pertes. Au-dessus de 1 la méthode gagne ; au-dessus de 1,5 elle est solide (sur assez de trades).">{num(s.profit_factor)}</Row>
        <Row label="Frais payés" tip="Frais d'achat/vente (et de report pour les shorts) cumulés sur la période.">{fm(s.fees)}</Row>
        <Row label="Appels au modèle" tip="Nombre d'analyses faites, leurs erreurs et les actions refusées par les garde-fous.">{s.calls} · {s.errors} erreur(s) · {s.refused} refus</Row>
        <Row label="Tokens" tip="Total envoyé et reçu pendant l'essai (de quoi estimer le coût chez un fournisseur payant).">{s.tokens_in} entrée / {s.tokens_out} sortie</Row>
      </tbody></table>
    </Card>
  )
}
