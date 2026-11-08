import { useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { ModelPicker } from '@/components/ui/ModelPicker'
import { Tip } from '@/components/ui/Tip'
import { fmPrice } from '@/lib/format'
import type { TradeProposal } from '@/lib/types'
import { useManualStore } from '@/stores/manualStore'
import { useProposalStore } from '@/stores/proposalStore'
import css from './Proposals.module.css'

const text = (n: number) => String(Number(n.toPrecision(6)))
const minutesAgo = (at: number) => Math.max(0, Math.round((Date.now() / 1000 - at) / 60))

/** Un preset du modèle : ses niveaux, sa justification et le bouton qui pré-remplit le ticket (rien n'est envoyé). */
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

/** Bloc de propositions du ticket d'ordre : quelques trades à prendre maintenant. « Pré-remplir » copie le preset dans le ticket ; le montant reste à ton choix. */
export function Proposals() {
  const status = useManualStore((s) => s.status)
  const { result, loading: asking } = useProposalStore()
  const { ask, cancel, dismiss, restore } = useProposalStore.getState()
  const analyzing = asking || !!status?.analyzing

  const { setTicket, saveConfig } = useManualStore.getState()
  const config = status?.config
  const provider = status?.providers[config?.provider ?? '']

  // au chargement de la page et à la fin d'une analyse (lancée avant un rechargement), on retrouve la proposition du serveur
  useEffect(() => {
    if (!analyzing) void restore()
  }, [analyzing, restore])

  const use = (p: TradeProposal) => {
    setTicket({
      pair: p.pair, side: p.side, leverage: String(p.leverage), type: p.type, limit: p.limit_price ? text(p.limit_price) : '',
      sl: text(p.sl_pct), tp: text(p.tp_pct), trail: text(p.trail_pct),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // en-tête de l'accordéon : titre et boutons ; un clic sur les boutons ne replie pas le bloc
  const header = (
    <span className={css.head}>
      <span className={css.name}><Sparkles className="ic" />Propositions
        <Tip text="Le modèle choisi regarde le marché en bougies de 4 h et propose des trades à prendre maintenant. Il ne passe aucun ordre et ne choisit pas le montant : « Pré-remplir » remplit seulement le ticket. Chaque demande est un appel au fournisseur (payant sauf modèle local). Le choix du modèle est mémorisé ; celui du Bot IA est indépendant." />
      </span>
      <span className={css.actions} onClick={(e) => e.preventDefault()}>
        {result && <Button variant="sec" size="xs" title="Fermer les propositions" onClick={dismiss}><X className="ic m0" /></Button>}
        {analyzing
          ? <Button size="title" variant="sec" title="Interrompt l'analyse et coupe la connexion au modèle" onClick={() => void cancel()}>Annuler</Button>
          : <Button size="title" disabled={status?.llm_ok === false} onClick={() => void ask()}>{result ? 'Redemander' : 'Demander'}</Button>}
      </span>
    </span>
  )

  return (
    <div className={css.box}>
      <Accordion id="trading-proposals" title={header}>
        {analyzing && <div className="hint">Analyse en cours : le modèle étudie le marché, la réponse apparaîtra ici.</div>}
        {status && config && (
          <div className={css.model}>
            <ModelPicker compact providers={status.providers} provider={config.provider} model={config.model}
              onChange={(p, m) => void saveConfig({ provider: p, model: m })} />
          </div>
        )}
        <div className={`hint ${css.explain}`}>
          Le modèle regarde le marché (bougies de 4 h) et propose quelques trades à prendre maintenant, avec leurs stops. Il ne passe aucun ordre
          et ne choisit pas le montant : tu pré-remplis le ticket, tu vérifies, tu valides.
          {status?.llm_ok === false && ` Clé ${provider?.env ?? ''} absente (.env) : ajoute-la puis relance le serveur.`}
        </div>
      {result && (
        <>
          <div className={css.view}>{result.market_view}</div>
          {result.no_edge && <div className="warn">Le modèle ne voit pas d&apos;avantage net maintenant : attendre est une option valable.</div>}
          {result.trades.map((p) => <Preset key={p.pair} p={p} onUse={use} />)}
          <div className={css.stale}>
            Proposé il y a {minutesAgo(result.at)} min ({result.provider} · {result.model}) — les prix bougent, vérifie le prix actuel avant d&apos;envoyer.
          </div>
        </>
      )}
      </Accordion>
    </div>
  )
}
