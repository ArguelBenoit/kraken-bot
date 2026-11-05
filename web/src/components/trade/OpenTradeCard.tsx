import { Ban, ChevronLeft, ChevronRight, Target, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { fm, fmPrice, gainClass, signed } from '@/lib/format'
import { computeOpenTrade, type OpenTradeInput, type OpenTradeView } from '@/lib/trade'
import css from './OpenTradeCard.module.css'
import { TradeDetails, type DetailRow } from './TradeDetails'

const LONG_TIPS = {
  stop: "Prix de déclenchement du stop (le plus haut entre le stop loss et le stop suiveur) et sa distance par rapport à l'achat. Si le prix l'atteint, la position est vendue.",
  entry: "Prix auquel tu as acheté. Au-dessus, le trade gagne ; en dessous, il perd.",
  exit: "Objectif (take profit) : la position est vendue s'il est atteint. Sans objectif, c'est le plus haut atteint depuis l'achat (pic), que le stop suiveur utilise comme repère.",
} as const

/** Infobulles d'un short : tout est inversé (gain quand le prix baisse) et la position peut être liquidée. */
const SHORT_TIPS = {
  stop: "Prix de déclenchement du stop (le plus bas entre le stop loss et le stop suiveur) et sa distance par rapport à la vente. Si le prix MONTE jusque-là, la position est rachetée pour limiter la perte.",
  entry: "Prix auquel tu as vendu à découvert. En dessous, le trade gagne ; au-dessus, il perd.",
  exit: "Objectif (take profit) : la position est rachetée s'il est atteint. Sans objectif, c'est le plus bas atteint depuis la vente (creux), que le stop suiveur utilise comme repère.",
} as const

const TIPS_ENTRY = { long: LONG_TIPS.entry, short: SHORT_TIPS.entry } as const

/** Barre stop → objectif ; le prix actuel est écrit au-dessus du repère orange (décalé pour rester dans la barre aux extrémités). */
function Gauge({ v, price, entry }: { v: OpenTradeView; price: ReactNode; entry: ReactNode }) {
  const { gauge: g } = v
  const edge = g.pos < 12 ? 'left' : g.pos > 88 ? 'right' : 'mid'
  const entryEdge = g.entry < 12 ? 'left' : g.entry > 88 ? 'right' : 'mid'
  return (
    <div className={css.gaugeWrap}>
      <span className={`${css.nowLabel} ${css[edge]}`} style={edge === 'mid' ? { left: `${g.pos}%` } : undefined}>{price}</span>
      <div className={css.gauge}>
        <div className={css.fill} style={{ left: `${g.fillLeft}%`, width: `${g.fillWidth}%`, background: g.positive ? '#3ddc8466' : '#ff4d4d66' }} />
        <div className={css.entry} style={{ left: `${g.entry}%` }} />
        <div className={css.now} style={{ left: `${g.pos}%` }} />
      </div>
      <span className={`${css.entryLabel} ${css[entryEdge]}`} style={entryEdge === 'mid' ? { left: `${g.entry}%` } : undefined}>{entry}<Tip text={TIPS_ENTRY[v.side]} /></span>
    </div>
  )
}

function Body({ v, info, quote }: { v: OpenTradeView; info?: ReactNode; quote: string }) {
  const short = v.side === 'short'
  const TIPS = short ? SHORT_TIPS : LONG_TIPS
  const pr = (x: number) => fmPrice(x, v.entry).replace(/\s/g, '')         // même précision partout, selon le prix d'achat ; sans séparateur de milliers (carte compacte)
  const gain = (x: number) => <b className={gainClass(x)}>{signed(x)}{quote}</b>        // gain ou perte en monnaie de la paire
  return (
    <>
      <Gauge v={v} price={<>{pr(v.px)} · {gain(v.netGain)}</>} entry={<>{short ? 'vente' : 'achat'} {pr(v.entry)} · {fm(v.cost)}{quote}</>} />
      <div className={css.labels}>
        {v.stopPrice != null && v.stopChg != null ? (
          <span className="t-ko"><ChevronLeft className="ic" />STOP {signed(v.stopChg)}% · {pr(v.stopPrice)} · {gain(v.stopGain ?? 0)}<Tip text={TIPS.stop} /></span>
        ) : (
          <span className="t-ko"><ChevronLeft className="ic" />aucun stop<Tip text={TIPS.stop} /></span>
        )}
        {v.tpPrice != null && v.tpChg != null ? (
          <span className="t-ok">{short ? 'RACHAT' : 'VENTE'} {signed(v.tpChg)}% · {pr(v.tpPrice)} · {gain(v.exitGain)}<Tip text={TIPS.exit} right /><ChevronRight className="ic m0" /></span>
        ) : (
          <span className="t-ok">{short ? 'creux' : 'pic'} {signed(v.peakPct)}% · {pr(v.peak)} · {gain(v.exitGain)}<Tip text={TIPS.exit} right /><ChevronRight className="ic m0" /></span>
        )}
      </div>
      {v.zone && (
        <div className={css.zone}>
          {v.zone.icon === 'ban' ? <Ban className="ic" /> : <Target className="ic" />}
          {v.zone.text}
        </div>
      )}
      {info && <div className={css.rule}>{info}</div>}
    </>
  )
}

const SEP: DetailRow = ['-', null]

/** Toutes les valeurs calculées d'une position, pour l'infobulle de détail. */
function detailRows(v: OpenTradeView, extra: DetailRow[]): DetailRow[] {
  const short = v.side === 'short'
  const pr = (x: number) => fmPrice(x, v.entry)
  return [
    ['Sens', short ? 'SHORT (vente à découvert)' : 'LONG (achat)'],
    ['Quantité', v.qty],
    [short ? 'Prix de vente (entrée)' : "Prix d'achat (entrée)", pr(v.entry)],
    ['Prix actuel', pr(v.px)],
    ['Variation', <span className={gainClass(v.chg)}>{signed(v.chg)} %</span>],
    SEP,
    [short ? 'Valeur de vente' : "Valeur d'achat", fm(v.cost)],
    [short ? 'Valeur de rachat' : 'Valeur actuelle', fm(v.value)],
    ['Gain brut', <span className={gainClass(v.grossGain)}>{signed(v.grossGain)}</span>],
    ['Gain net estimé', <span className={gainClass(v.netGain)}>{signed(v.netGain)}</span>],
    SEP,
    ['Stop', v.stopPrice != null && v.stopChg != null ? `${pr(v.stopPrice)} (${signed(v.stopChg)} %)` : 'aucun'],
    ['Objectif', v.tpPrice != null && v.tpChg != null ? `${pr(v.tpPrice)} (${signed(v.tpChg)} %)` : 'aucun'],
    [short ? 'Creux atteint' : 'Pic atteint', `${pr(v.peak)} (${signed(v.peakPct)} %)`],
    ...(extra.length ? [SEP, ...extra] : []),
  ]
}

interface Props {
  /** Libellé de la paire (ex. « ETH/USDC »). */
  pair: string
  input: OpenTradeInput | null
  /** Boutons dans le titre de la carte (liquider, fermer…). */
  actions?: ReactNode
  /** Ligne de contexte sous la jauge (règle de sortie, stratégie, raison d'entrée…). */
  info?: ReactNode
  /** Lignes ajoutées à l'infobulle de détail (levier, frais, date d'ouverture…). */
  details?: DetailRow[]
  /** Contenu supplémentaire en bas de carte (édition des stops…). */
  children?: ReactNode
}

/**
 * « Trade en cours », version compacte : la paire en titre, le % gagné / perdu en bout de titre (à gauche des boutons), puis le détail et la jauge stop → objectif.
 * Commune au Bot IA et au Trading manuel : chaque page fournit une position et ses actions.
 * Verte ou rouge selon que le prix est au-dessus ou sous l'entrée.
 */
export function OpenTradeCard({ pair, input, actions, info, details = [], children }: Props) {
  const v = input ? computeOpenTrade(input) : null
  const quote = pair.split(' ')[0].split('/')[1] ?? ''           // monnaie de la paire (« ETH/USDC » → USDC)
  return (
    <Card
      title={pair} icon={Zap} className={`${css.card} ${v ? css[v.tone] : ''}`}
      actions={<>{v && <b className={`${css.pct} ${gainClass(v.chg)}`}>{signed(v.chg)}%</b>}{actions}{v && <TradeDetails rows={detailRows(v, details)} />}</>}
    >
      {v ? <Body v={v} info={info} quote={quote} /> : <div>Prix indisponible pour {pair}</div>}
      {children}
    </Card>
  )
}
