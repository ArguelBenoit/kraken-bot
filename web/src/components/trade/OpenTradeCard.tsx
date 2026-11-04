import { Ban, ChevronLeft, ChevronRight, Target, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { fm, signed, tone } from '@/lib/format'
import { computeOpenTrade, type OpenTradeInput, type OpenTradeView } from '@/lib/trade'
import css from './OpenTradeCard.module.css'

function Gauge({ v }: { v: OpenTradeView }) {
  const { gauge: g } = v
  return (
    <div className={css.gauge}>
      <div className={css.fill} style={{ left: `${g.fillLeft}%`, width: `${g.fillWidth}%`, background: g.positive ? '#3ddc8466' : '#ff4d4d66' }} />
      <div className={css.entry} style={{ left: `${g.entry}%` }} />
      <div className={css.now} style={{ left: `${g.pos}%` }} />
    </div>
  )
}

function Body({ pair, v, info }: { pair: string; v: OpenTradeView; info?: ReactNode }) {
  const dp = v.entry < 1 ? 6 : 2
  const pr = (x: number) => fm(x, dp)
  const cls = tone(v.chg) === 'ok' ? 't-ok' : 't-ko'
  return (
    <>
      <div className={css.top}>
        <b>{pair}</b>
        <b className={cls}>{signed(v.chg)}%</b>
      </div>
      <div className={css.grid}>
        <div><small>Acheté</small>{fm(v.qty, 6)} @ {pr(v.entry)}</div>
        <div><small>Détenu maintenant</small>{fm(v.qty, 6)} @ {pr(v.px)}</div>
        <div><small>Valeur d&apos;achat</small>{fm(v.cost)}</div>
        <div><small>Valeur actuelle</small>{fm(v.value)}</div>
        <div><small>Gain brut</small><span className={cls}>{signed(v.grossGain)}</span></div>
        <div><small>Gain net estimé (frais de vente)</small><span className={v.netGain >= 0 ? 't-ok' : 't-ko'}>{signed(v.netGain)}</span></div>
      </div>
      <Gauge v={v} />
      <div className={css.labels}>
        {v.stopPrice != null && v.stopChg != null ? (
          <span className="t-ko"><ChevronLeft className="ic" />STOP {signed(v.stopChg)}% · {pr(v.stopPrice)}</span>
        ) : (
          <span className="t-ko"><ChevronLeft className="ic" />aucun stop</span>
        )}
        <span>│ achat {pr(v.entry)}</span>
        {v.tpPrice != null && v.tpChg != null ? (
          <span className="t-ok">VENTE {signed(v.tpChg)}% · {pr(v.tpPrice)}<ChevronRight className="ic m0" /></span>
        ) : (
          <span className="t-ok">pic {signed(v.peakPct)}% · {pr(v.peak)}<ChevronRight className="ic m0" /></span>
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
 * « Trade en cours » : la carte mise en avant d'une position ouverte (PnL, jauge stop → objectif, zone atteinte).
 * Commune au Bot simple, au Bot IA et au Trading manuel : chaque page fournit une position et ses actions.
 * Verte ou rouge selon que le prix est au-dessus ou sous l'entrée.
 */
export function OpenTradeCard({ pair, input, actions, info, children }: Props) {
  const v = input ? computeOpenTrade(input) : null
  return (
    <Card title="Trade en cours" icon={Zap} className={`${css.card} ${v ? css[v.tone] : ''}`} actions={actions}>
      {v ? <Body pair={pair} v={v} info={info} /> : <div>Prix indisponible pour {pair}</div>}
      {children}
    </Card>
  )
}
