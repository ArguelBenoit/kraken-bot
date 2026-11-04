import { Crosshair } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { PAIRS, pairLabel } from '@/lib/constants'
import { fm, fmPrice, gainClass, signed } from '@/lib/format'
import { previewTicket, quickSizes } from '@/lib/ticket'
import { useManualStore } from '@/stores/manualStore'
import { useMarketStore } from '@/stores/marketStore'

const clean = (n: number) => String(Number(n.toPrecision(6)))

/** Ticket d'ordre : achat au marché ou limite, avec stop loss / take profit / stop suiveur et aperçu du risque. */
export function OrderTicketCard() {
  const status = useManualStore((s) => s.status)
  const t = useManualStore((s) => s.ticket)
  const notice = useManualStore((s) => s.notice)
  const { setTicket, submit } = useManualStore.getState()
  const row = useMarketStore((s) => s.rows.find((r) => r.pair === t.pair))
  const cfg = status?.config
  const live = cfg?.mode === 'live'
  const price = status?.quote?.pair === t.pair ? status.quote.price : null

  const size = Number(t.size)
  const sl = Number(t.sl || 0)
  const tp = Number(t.tp || 0)
  const preview = previewTicket({ price, size, feePct: cfg?.fee_pct ?? 0.26, slPct: sl, tpPct: tp, type: t.type, limitPrice: Number(t.limit) })
  const base = !cfg ? 0 : live ? cfg.max_order : (status?.cash ?? 0)
  const cap = cfg?.max_order ?? size
  const tooBig = cfg != null && size > cfg.max_order
  const noCash = cfg?.mode === 'paper' && size > (status?.cash ?? 0)
  const limitInvalid = t.type === 'limit' && !(Number(t.limit) > 0 && (price == null || Number(t.limit) < price))
  const canSubmit = !!preview && size >= 5 && !tooBig && !noCash && !limitInvalid

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (live) {
      const what = t.type === 'limit' ? `ordre limite ≤ ${t.limit}` : 'ordre au marché'
      const ok = window.confirm(`ORDRE RÉEL sur Kraken : acheter pour ${size} de ${pairLabel(t.pair)} (${what}).\nStop loss ${sl || 'aucun'}% · take profit ${tp || 'aucun'}%.\n\nConfirmer ?`)
      if (!ok) return
    }
    await submit(live)
  }

  return (
    <Card title="Passer un ordre" icon={Crosshair}>
      {live && (
        <div className="warn danger">
          Mode LIVE : cet ordre sera réel. Jamais testé avec de l&apos;argent réel. Les stops ne sont pas posés chez Kraken : si ce programme
          s&apos;arrête, rien ne se déclenche.{status && !status.live_ok && ' Clés Kraken absentes.'}
        </div>
      )}
      <form onSubmit={onSubmit}>
        <Field label="Paire">
          <select value={t.pair} onChange={(e) => setTicket({ pair: e.target.value })}>
            {PAIRS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <div className="field">
          <span>Prix actuel</span>
          <b>
            {price == null ? '–' : fmPrice(price)}
            {row?.chg24 != null && <span className={gainClass(row.chg24)}> {signed(row.chg24)}%</span>}
          </b>
        </div>

        <div className="field">
          <span>Type</span>
          <div className="seg">
            <button type="button" className={t.type === 'market' ? 'on' : ''} onClick={() => setTicket({ type: 'market' })}>Marché</button>
            <button type="button" className={t.type === 'limit' ? 'on' : ''} onClick={() => setTicket({ type: 'limit', limit: t.limit || (price ? clean(price * 0.99) : '') })}>Limite</button>
          </div>
        </div>
        {t.type === 'limit' && (
          <>
            <Field label="Prix limite (achat ≤)" tip="L'achat est exécuté quand le prix descend à cette valeur ou en dessous. Surveillé par ce programme (pas d'ordre posé chez Kraken).">
              <input type="number" step="any" value={t.limit} onChange={(e) => setTicket({ limit: e.target.value })} />
            </Field>
            <div className="chips">
              {[1, 2, 5].map((p) => (
                <button type="button" className="chip" key={p} disabled={!price} onClick={() => price && setTicket({ limit: clean(price * (1 - p / 100)) })}>−{p}%</button>
              ))}
            </div>
          </>
        )}

        <Field label="Montant (stable)" tip={`Montant dépensé. Maximum par ordre : ${cfg ? fm(cfg.max_order, 0) : '–'} (réglable plus bas).`}>
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
          <Field label="SL %" tip="Stop loss : vente automatique si le prix perd ce pourcentage depuis l'achat. 0 = aucun (déconseillé).">
            <input type="number" step="any" value={t.sl} onChange={(e) => setTicket({ sl: e.target.value })} />
          </Field>
          <Field label="TP %" tip="Take profit : vente automatique quand le gain atteint ce pourcentage. 0 = aucun.">
            <input type="number" step="any" value={t.tp} onChange={(e) => setTicket({ tp: e.target.value })} />
          </Field>
        </div>
        <Field label="Stop suiveur %" tip="Vente si le prix retombe de ce pourcentage depuis son plus haut atteint pendant la position. 0 = désactivé.">
          <input type="number" step="any" value={t.trail} onChange={(e) => setTicket({ trail: e.target.value })} />
        </Field>

        {preview ? (
          <div className="summary">
            <span>Prix d&apos;entrée</span><span>{fmPrice(preview.entry)}</span>
            <span>Quantité ≈</span><span>{fm(preview.qty, 6)}</span>
            <span>Stop loss</span><span>{preview.slPrice == null ? 'aucun' : `${fmPrice(preview.slPrice, preview.entry)} (${signed(preview.lossAtSl ?? 0)})`}</span>
            <span>Take profit</span><span>{preview.tpPrice == null ? 'aucun' : `${fmPrice(preview.tpPrice, preview.entry)} (${signed(preview.gainAtTp ?? 0)})`}</span>
            <span>Gain / risque</span><span>{preview.ratio == null ? '–' : `${fm(preview.ratio, 2)} : 1`}</span>
            <span>Frais aller-retour</span><span>≈ {fm(preview.fees)}</span>
          </div>
        ) : (
          <div className="hint">Renseigne un montant pour voir l&apos;aperçu du risque.</div>
        )}
        {sl === 0 && <div className="warn">Sans stop loss, rien ne limitera la perte : tu devras fermer la position toi-même.</div>}
        {tooBig && <div className="notice error">Montant supérieur au maximum autorisé ({fm(cfg!.max_order, 0)}).</div>}
        {noCash && !tooBig && <div className="notice error">Solde paper insuffisant ({fm(status?.cash)}).</div>}
        {limitInvalid && <div className="notice error">Le prix limite doit être sous le prix actuel.</div>}

        <Button type="submit" className="block buy" disabled={!canSubmit}>
          {t.type === 'limit' ? 'Placer l’ordre limite' : 'Acheter au marché'} · {pairLabel(t.pair)}
        </Button>
        <Notice notice={notice} collapse />
      </form>
    </Card>
  )
}
