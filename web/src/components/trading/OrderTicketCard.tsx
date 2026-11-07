import { Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Tip } from '@/components/ui/Tip'
import { Proposals } from './Proposals'
import { PAIRS, pairLabel } from '@/lib/constants'
import { fm, fmPrice, gainClass, signed } from '@/lib/format'
import { liqDistance, previewFromTicket, quickSizes } from '@/lib/ticket'
import { useManualStore } from '@/stores/manualStore'
import { useMarketStore } from '@/stores/marketStore'
import { confirmAction, toast } from '@/stores/uiStore'

const clean = (n: number) => String(Number(n.toPrecision(6)))

/** Ticket d'ordre : propositions du modèle en tête, puis long (achat) ou short (vente à découvert), au marché ou limite, avec stop loss / take profit / stop suiveur et aperçu du risque. */
export function OrderTicketCard() {
  const status = useManualStore((s) => s.status)
  const t = useManualStore((s) => s.ticket)
  const { setTicket, submit } = useManualStore.getState()
  const row = useMarketStore((s) => s.rows.find((r) => r.pair === t.pair))
  const cfg = status?.config
  const live = cfg?.mode === 'live'
  const price = status?.quote?.pair === t.pair ? status.quote.price : null

  const short = t.side === 'short'
  const leverage = Number(t.leverage) || 2
  const size = Number(t.size)
  const sl = Number(t.sl || 0)
  const tp = Number(t.tp || 0)
  const preview = cfg ? previewFromTicket(t, cfg, price) : null
  // Short : la garantie (montant / levier) et les frais sont retirés du cash, pas le montant entier
  const base = !cfg ? 0 : live ? cfg.max_order : (status?.cash ?? 0) * (short ? leverage : 1)
  const cap = cfg?.max_order ?? size
  const liqDist = liqDistance(leverage)

  /** Première raison qui empêche d'envoyer l'ordre (affichée en toast au clic sur le bouton), ou null. */
  const problem = (): string | null => {
    if (!cfg || !preview) return 'Renseigne un montant et un prix valides.'
    if (size < 5) return 'Montant minimum : 5.'
    if (size > cfg.max_order) return `Montant supérieur au maximum autorisé (${fm(cfg.max_order, 0)}) : modifiable dans les réglages.`
    if (short && !status?.shorts_allowed) return 'Shorts LIVE désactivés : active-les dans les réglages (marge Kraken jamais validée).'
    if (short && sl <= 0) return 'Un short exige un stop loss : sans lui, la perte n’est pas limitée.'
    if (short && sl >= liqDist) return `Stop loss trop large : la liquidation est estimée à +${liqDist.toFixed(1)} %, le stop doit être en dessous.`
    const limit = Number(t.limit)
    if (t.type === 'limit' && !(limit > 0 && (price == null || (short ? limit > price : limit < price))))
      return `Le prix limite doit être ${short ? 'au-dessus' : 'sous'} le prix actuel.`
    if (cfg.mode === 'paper' && (preview.collateral ?? size) + (short ? preview.fees : 0) > (status?.cash ?? 0))
      return `Solde paper insuffisant (${fm(status?.cash)} disponibles).`
    return null
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const refusal = problem()
    if (refusal) {
      toast.error(refusal)
      return
    }
    if (live) {
      const ok = await confirmAction({
        title: short ? 'Vendre à découvert en RÉEL ?' : 'Acheter en RÉEL ?', danger: true, confirmLabel: short ? 'Vendre à découvert' : 'Acheter',
        message: `ORDRE RÉEL sur Kraken avec ton argent.${short ? '\nShort avec levier : la perte peut dépasser la mise.' : ''}`,
        lines: [
          ['Paire', pairLabel(t.pair)],
          ['Sens', short ? `Short ×${leverage}` : 'Long'],
          ['Montant', fm(size)],
          ['Type', t.type === 'limit' ? `Limite ${short ? '≥' : '≤'} ${t.limit}` : 'Marché'],
          ['Stop loss', sl ? `${short ? '+' : '−'}${sl} %` : 'aucun'],
          ['Take profit', tp ? `${short ? '−' : '+'}${tp} %` : 'aucun'],
        ],
      })
      if (!ok) return
    }
    await submit(live)
  }

  return (
    <Card title="Passer un ordre" icon={Crosshair}>
      {live && (
        <div className="warn danger">
          Mode LIVE : cet ordre sera réel. Jamais testé avec de l&apos;argent réel. Le stop loss (ou, à défaut, le stop suiveur) est posé chez Kraken ; l&apos;objectif et les ordres limites sont surveillés par ce programme
          (s&apos;il s&apos;arrête, ils ne se déclenchent pas).{status && !status.live_ok && ' Clés Kraken absentes.'}
        </div>
      )}
      <Proposals />
      <form onSubmit={onSubmit}>
        <Field label="Paire" tip="La crypto à acheter, cotée contre un stablecoin (≈ 1 $). Le graphique et le prix actuel suivent ton choix.">
          <select value={t.pair} onChange={(e) => setTicket({ pair: e.target.value })}>
            {PAIRS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div className="field">
          <span>Prix actuel<Tip text="Dernier prix de la paire sur Kraken, et sa variation sur 24 h. Un ordre au marché est exécuté à ce prix, à quelques centimes près." /></span>
          <b>
            {price == null ? '–' : fmPrice(price)}
            {row?.chg24 != null && <span className={gainClass(row.chg24)}> {signed(row.chg24)}%</span>}
          </b>
        </div>

        <div className="field">
          <span>Sens<Tip text="Long = tu achètes et tu gagnes si le prix monte. Short = tu vends à découvert (en marge, avec levier) et tu gagnes si le prix baisse : la perte peut dépasser la mise et la position peut être liquidée si le prix monte trop. Un short exige un stop loss." /></span>
          <div className="seg">
            <button type="button" className={!short ? 'on' : ''} onClick={() => setTicket({ side: 'long', limit: '' })}>Long</button>
            <button type="button" className={short ? 'on short' : ''} onClick={() => setTicket({ side: 'short', limit: '', sl: sl > 0 ? t.sl : '2', tp: tp > 0 ? t.tp : '4' })}>Short</button>
          </div>
        </div>
        {short && (
          <Field label="Levier" tip={`Multiplie l'exposition : avec ×${leverage}, il suffit d'immobiliser ${cfg ? fm(size / leverage) : '…'} de garantie pour vendre ${fm(size, 0)}. Les gains et les pertes sont multipliés d'autant. Maximum réglable plus bas (${cfg?.max_leverage ?? 3}).`}>
            <input type="number" step="any" min={2} max={cfg?.max_leverage ?? 3} value={t.leverage} onChange={(e) => setTicket({ leverage: e.target.value })} />
          </Field>
        )}
        <div className="field">
          <span>Type<Tip text="Marché = achat immédiat au prix actuel. Limite = l'achat se fait seulement si le prix descend jusqu'au prix que tu fixes (ordre surveillé par ce programme, pas posé chez Kraken)." /></span>
          <div className="seg">
            <button type="button" className={t.type === 'market' ? 'on' : ''} onClick={() => setTicket({ type: 'market' })}>Marché</button>
            <button type="button" className={t.type === 'limit' ? 'on' : ''} onClick={() => setTicket({ type: 'limit', limit: t.limit || (price ? clean(price * (short ? 1.01 : 0.99)) : '') })}>Limite</button>
          </div>
        </div>
        {t.type === 'limit' && (
          <>
            <Field label={short ? 'Prix limite (vente ≥)' : 'Prix limite (achat ≤)'} tip={short ? "Le short est ouvert quand le prix monte à cette valeur ou au-dessus. Surveillé par ce programme (pas d'ordre posé chez Kraken)." : "L'achat est exécuté quand le prix descend à cette valeur ou en dessous. Surveillé par ce programme (pas d'ordre posé chez Kraken)."}>
              <input type="number" step="any" value={t.limit} onChange={(e) => setTicket({ limit: e.target.value })} />
            </Field>
            <div className="chips">
              {[1, 2, 5].map((p) => (
                <button type="button" className="chip" key={p} disabled={!price} onClick={() => price && setTicket({ limit: clean(price * (1 + (short ? p : -p) / 100)) })}>{short ? '+' : '−'}{p}%</button>
              ))}
            </div>
          </>
        )}

        <Field label={short ? 'Montant vendu (stable)' : 'Montant (stable)'} tip={`${short ? 'Valeur de la position vendue à découvert' : 'Montant dépensé'}. Maximum par ordre : ${cfg ? fm(cfg.max_order, 0) : '–'} (réglable plus bas).`}>
          <input type="number" step="any" value={t.size} onChange={(e) => setTicket({ size: e.target.value })} />
        </Field>
        <div className="chips">
          {quickSizes(base, cap).map((q) => (
            <button type="button" className="chip" key={q.pct} disabled={q.value < 5} onClick={() => setTicket({ size: String(q.value) })}>
              {q.pct === 100 ? 'Max' : `${q.pct}%`}
            </button>
          ))}
        </div>

        <div className="fields">
          <Field label="SL %" tip={short ? "Stop loss : rachat automatique si le prix MONTE de ce pourcentage depuis la vente. Obligatoire pour un short, et inférieur à la distance de liquidation." : "Stop loss : vente automatique si le prix perd ce pourcentage depuis l'achat. 0 = aucun (déconseillé)."}>
            <input type="number" step="any" value={t.sl} onChange={(e) => setTicket({ sl: e.target.value })} />
          </Field>
          <Field label="TP %" tip={short ? "Take profit : rachat automatique quand le prix BAISSE de ce pourcentage depuis la vente. 0 = aucun." : "Take profit : vente automatique quand le gain atteint ce pourcentage. 0 = aucun."}>
            <input type="number" step="any" value={t.tp} onChange={(e) => setTicket({ tp: e.target.value })} />
          </Field>
        </div>
        <Field label="Stop suiveur %" tip={short ? "Rachat si le prix remonte de ce pourcentage depuis son plus bas atteint pendant la position. 0 = désactivé." : "Vente si le prix retombe de ce pourcentage depuis son plus haut atteint pendant la position. 0 = désactivé."}>
          <input type="number" step="any" value={t.trail} onChange={(e) => setTicket({ trail: e.target.value })} />
        </Field>

        {preview ? (
          <div className="summary">
            <span>Prix d&apos;entrée<Tip text="Prix auquel l'achat sera fait : le prix actuel (marché) ou ton prix limite." /></span><span>{fmPrice(preview.entry)}</span>
            <span>Quantité ≈<Tip text="Quantité de crypto obtenue pour ton montant, une fois les frais d'achat retirés." /></span><span>{fm(preview.qty, 6)}</span>
            <span>Stop loss<Tip text="Prix de vente automatique si le trade perd le pourcentage choisi, et la perte en monnaie à ce moment-là, frais compris." /></span><span>{preview.slPrice == null ? 'aucun' : `${fmPrice(preview.slPrice, preview.entry)} (${signed(preview.lossAtSl ?? 0)})`}</span>
            <span>Take profit<Tip text="Prix de vente automatique quand l'objectif est atteint, et le gain en monnaie à ce moment-là, frais compris." /></span><span>{preview.tpPrice == null ? 'aucun' : `${fmPrice(preview.tpPrice, preview.entry)} (${signed(preview.gainAtTp ?? 0)})`}</span>
            <span>Gain / risque<Tip text="Gain à l'objectif divisé par la perte au stop : 2 : 1 = on gagne 2 pour 1 risqué. Vise au moins 1,5 : 1 pour compenser les frais et les trades perdants." /></span><span>{preview.ratio == null ? '–' : `${fm(preview.ratio, 2)} : 1`}</span>
            {preview.collateral != null && preview.liqPrice != null && (
              <>
                <span>Garantie immobilisée<Tip text="Part du cash bloquée tant que le short est ouvert (montant ÷ levier). Rendue à la fermeture, gains et pertes inclus." /></span><span>{fm(preview.collateral)}</span>
                <span>Liquidation estimée<Tip text={`Si le prix monte jusqu'ici (+${liqDist.toFixed(1)} % à ×${leverage}), la position est fermée de force et la garantie est perdue. Estimation : le calcul réel de Kraken dépend de ton niveau de marge. Ton stop loss doit être bien en dessous.`} /></span><span className="t-ko">{fmPrice(preview.liqPrice, preview.entry)}</span>
              </>
            )}
            <span>Frais aller-retour<Tip text="Frais Kraken estimés pour acheter puis vendre (≈ 0,5 % du montant). Le trade doit gagner plus que ça pour être rentable." /></span><span>≈ {fm(preview.fees)}</span>
          </div>
        ) : (
          <div className="hint">Renseigne un montant pour voir l&apos;aperçu du risque.</div>
        )}
        {short && <div className="warn">Short ×{leverage} : la perte peut dépasser la mise ; liquidation estimée à +{liqDist.toFixed(1)} %. Frais de report toutes les 4 h.</div>}
        {!short && sl === 0 && <div className="warn">Sans stop loss, rien ne limitera la perte : tu devras fermer la position toi-même.</div>}

        <Button type="submit" className={`block ${short ? 'sell' : 'buy'}`}>
          {t.type === 'limit' ? 'Placer l’ordre limite' : short ? 'Vendre à découvert au marché' : 'Acheter au marché'} · {pairLabel(t.pair)}
        </Button>
      </form>
    </Card>
  )
}
