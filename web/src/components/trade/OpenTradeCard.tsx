import { Ban, ChevronLeft, ChevronRight, Target, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { Tip } from '@/components/ui/Tip'
import { fm, fmPrice, gainClass, signed } from '@/lib/format'
import { computeOpenTrade, type OpenTradeInput, type OpenTradeView } from '@/lib/trade'
import css from './OpenTradeCard.module.css'

const TIPS = {
  value: "Valeur d'achat = ce que tu as dépensé pour ce trade (le montant du ticket, frais d'achat compris). Valeur actuelle = ce que vaut l'actif maintenant (quantité × prix actuel), avant les frais de vente.",
  gain: "Gain brut = quantité × (prix actuel − prix d'achat), sans frais. Gain net estimé = ce que tu récupérerais en vendant maintenant, frais d'achat et de vente déduits.",
  stop: "Prix de déclenchement du stop (le plus haut entre le stop loss et le stop suiveur) et sa distance par rapport à l'achat. Si le prix l'atteint, la position est vendue.",
  entry: "Prix auquel tu as acheté. Au-dessus, le trade gagne ; en dessous, il perd.",
  exit: "Objectif (take profit) : la position est vendue s'il est atteint. Sans objectif, c'est le plus haut atteint depuis l'achat (pic), que le stop suiveur utilise comme repère.",
} as const

/** Barre stop → objectif ; le prix actuel est écrit au-dessus du repère orange (décalé pour rester dans la barre aux extrémités). */
function Gauge({ v, price }: { v: OpenTradeView; price: string }) {
  const { gauge: g } = v
  const edge = g.pos < 12 ? 'left' : g.pos > 88 ? 'right' : 'mid'
  return (
    <div className={css.gaugeWrap}>
      <span className={`${css.nowLabel} ${css[edge]}`} style={edge === 'mid' ? { left: `${g.pos}%` } : undefined}>{price}</span>
      <div className={css.gauge}>
        <div className={css.fill} style={{ left: `${g.fillLeft}%`, width: `${g.fillWidth}%`, background: g.positive ? '#3ddc8466' : '#ff4d4d66' }} />
        <div className={css.entry} style={{ left: `${g.entry}%` }} />
        <div className={css.now} style={{ left: `${g.pos}%` }} />
      </div>
    </div>
  )
}

function Body({ v, info }: { v: OpenTradeView; info?: ReactNode }) {
  const pr = (x: number) => fmPrice(x, v.entry).replace(/\s/g, '')         // même précision partout, selon le prix d'achat ; sans séparateur de milliers (carte compacte)
  const cls = gainClass(v.chg)
  return (
    <>
      <div className={css.grid}>
        <div><small>Valeur d&apos;achat / actuelle<Tip text={TIPS.value} /></small><b>{fm(v.cost)}</b> / <b>{fm(v.value)}</b></div>
        <div>
          <small>Gain brut / net estimé<Tip text={TIPS.gain} right /></small>
          <b className={cls}>{signed(v.grossGain)}</b> / <b className={gainClass(v.netGain)}>{signed(v.netGain)}</b>
        </div>
      </div>
      <Gauge v={v} price={pr(v.px)} />
      <div className={css.labels}>
        {v.stopPrice != null && v.stopChg != null ? (
          <span className="t-ko"><ChevronLeft className="ic" />STOP {signed(v.stopChg)}% · {pr(v.stopPrice)}<Tip text={TIPS.stop} /></span>
        ) : (
          <span className="t-ko"><ChevronLeft className="ic" />aucun stop<Tip text={TIPS.stop} /></span>
        )}
        <span>│ achat {pr(v.entry)}<Tip text={TIPS.entry} /></span>
        {v.tpPrice != null && v.tpChg != null ? (
          <span className="t-ok">VENTE {signed(v.tpChg)}% · {pr(v.tpPrice)}<Tip text={TIPS.exit} right /><ChevronRight className="ic m0" /></span>
        ) : (
          <span className="t-ok">pic {signed(v.peakPct)}% · {pr(v.peak)}<Tip text={TIPS.exit} right /><ChevronRight className="ic m0" /></span>
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

interface Props {
  /** Libellé de la paire (ex. « ETH/USDC »). */
  pair: string
  input: OpenTradeInput | null
  /** Boutons dans le titre de la carte (liquider, fermer…). */
  actions?: ReactNode
  /** Ligne de contexte sous la jauge (règle de sortie, stratégie, raison d'entrée…). */
  info?: ReactNode
  /** Contenu supplémentaire en bas de carte (édition des stops…). */
  children?: ReactNode
}

/**
 * « Trade en cours », version compacte : la paire en titre, le % gagné / perdu en bout de titre (à gauche des boutons), puis le détail et la jauge stop → objectif.
 * Commune au Bot IA et au Trading manuel : chaque page fournit une position et ses actions.
 * Verte ou rouge selon que le prix est au-dessus ou sous l'entrée.
 */
export function OpenTradeCard({ pair, input, actions, info, children }: Props) {
  const v = input ? computeOpenTrade(input) : null
  return (
    <Card
      title={pair} icon={Zap} className={`${css.card} ${v ? css[v.tone] : ''}`}
      actions={<>{v && <b className={`${css.pct} ${gainClass(v.chg)}`}>{signed(v.chg)}%</b>}{actions}</>}
    >
      {v ? <Body v={v} info={info} /> : <div>Prix indisponible pour {pair}</div>}
      {children}
    </Card>
  )
}
