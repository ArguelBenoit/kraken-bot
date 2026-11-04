import { Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tip } from '@/components/ui/Tip'
import { fmPrice } from '@/lib/format'
import type { TradeProposal } from '@/lib/types'
import { useManualStore } from '@/stores/manualStore'
import { useProposalStore } from '@/stores/proposalStore'
import css from './ClaudeProposals.module.css'

const text = (n: number) => String(Number(n.toPrecision(6)))
const minutesAgo = (at: number) => Math.max(0, Math.round((Date.now() / 1000 - at) / 60))

/** Un preset de Claude : ses niveaux, sa justification et le bouton qui pré-remplit le ticket (rien n'est envoyé). */
function Preset({ p, onUse }: { p: TradeProposal; onUse: (p: TradeProposal) => void }) {
  return (
    <div className={css.item}>
      <div className={css.top}>
        <span className={css.title}>
          {p.label}{p.side === 'short' && <b className="t-ko"> SHORT ×{p.leverage}</b>} · {p.title}
        </span>
        <span className={css.conf}>confiance {Math.round(p.confidence * 100)} %</span>
      </div>
      <div className={css.levels}>
        <span>{p.type === 'limit'
            ? `Limite ${p.side === 'short' ? '≥' : '≤'} ${fmPrice(p.limit_price ?? p.price)} (${p.side === 'short' ? '+' : '−'}${p.limit_discount_pct} %)`
            : `Marché ≈ ${fmPrice(p.price)}`}</span>
        <span className="t-ko">SL {p.side === 'short' ? '+' : '−'}{p.sl_pct} %</span>
        {p.tp_pct > 0 && <span className="t-ok">TP {p.side === 'short' ? '−' : '+'}{p.tp_pct} %</span>}
        {p.trail_pct > 0 && <span className="t-ac">suiveur {p.trail_pct} %</span>}
        {p.ratio != null && <span className="t-mu">gain/risque {p.ratio} : 1</span>}
        {p.liq_price != null && <span className="t-mu">liquidation ≈ {fmPrice(p.liq_price, p.price)}</span>}
      </div>
      <div className={css.why}>{p.rationale}</div>
      <Button size="xs" onClick={() => onUse(p)}>Pré-remplir le ticket</Button>
    </div>
  )
}

/** Bloc Claude du ticket d'ordre : quelques trades à prendre maintenant. « Pré-remplir » copie le preset dans le ticket ; le montant reste à ton choix. */
export function ClaudeProposals() {
  const claudeOk = useManualStore((s) => s.status?.claude_ok)
  const { result, loading } = useProposalStore()
  const { ask, dismiss } = useProposalStore.getState()
  const { setTicket } = useManualStore.getState()

  const use = (p: TradeProposal) => {
    setTicket({
      pair: p.pair, side: p.side, leverage: String(p.leverage), type: p.type, limit: p.limit_price ? text(p.limit_price) : '',
      sl: text(p.sl_pct), tp: text(p.tp_pct), trail: text(p.trail_pct),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={css.box}>
      <div className={css.head}>
        <span className={css.name}><Sparkles className="ic" />Claude<Tip text="Claude regarde le marché en bougies de 4 h et propose des trades à prendre maintenant. Il ne passe aucun ordre et ne choisit pas le montant : « Pré-remplir » remplit seulement le ticket. Chaque demande est un appel payant." /></span>
        <span className={css.actions}>
          {result && <Button variant="sec" size="xs" title="Fermer les propositions" onClick={dismiss}><X className="ic m0" /></Button>}
          <Button size="title" disabled={loading || claudeOk === false} onClick={() => void ask()}>
            {loading ? 'Claude analyse…' : result ? 'Redemander' : 'Demander à Claude'}
          </Button>
        </span>
      </div>
      {!result && !loading && (
        <div className="hint">
          Claude regarde le marché (bougies de 4 h) et propose quelques trades à prendre maintenant, avec leurs stops. Il ne passe aucun ordre
          et ne choisit pas le montant : tu pré-remplis le ticket, tu vérifies, tu valides.
          {claudeOk === false && ' Clé ANTHROPIC_API_KEY absente (.env) : ajoute-la puis relance le serveur.'}
        </div>
      )}
      {result && (
        <>
          <div className={css.view}>{result.market_view}</div>
          {result.no_edge && <div className="warn">Claude ne voit pas d&apos;avantage net maintenant : attendre est une option valable.</div>}
          {result.trades.map((p) => <Preset key={p.pair} p={p} onUse={use} />)}
          <div className={css.stale}>
            Proposé il y a {minutesAgo(result.at)} min ({result.model}) — les prix bougent, vérifie le prix actuel avant d&apos;envoyer.
          </div>
        </>
      )}
    </div>
  )
}
