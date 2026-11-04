import { Ban, ChevronLeft, ChevronRight, LogOut, Target, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fm, signed, tone } from '@/lib/format'
import { pairLabel } from '@/lib/constants'
import { computeOpenTrade, exitRule, type OpenTradeView } from '@/lib/trade'
import type { BotConfig, BotState } from '@/lib/types'
import { useBotStore } from '@/stores/botStore'
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

function Body({ st, c, v }: { st: BotState; c: BotConfig; v: OpenTradeView }) {
  const dp = v.entry < 1 ? 6 : 2
  const pr = (x: number) => fm(x, dp)
  const cls = tone(v.chg) === 'ok' ? 't-ok' : 't-ko'
  return (
    <>
      <div className={css.top}>
        <b>{pairLabel(st.pair ?? c.pair)}</b>
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
        <span className="t-ko"><ChevronLeft className="ic" />STOP {v.trailing ? fm(v.lo) : `−${fm(v.stopPct)}`}% · {pr(v.stopPrice)}</span>
        <span>│ achat {pr(v.entry)}</span>
        {v.trailing ? (
          <span className="t-ok">pic {signed(v.peakPct)}% · {pr(v.peak)}<ChevronRight className="ic m0" /></span>
        ) : (
          <span className="t-ok">VENTE +{v.tpPct}% · {pr(v.entry * (1 + v.tpPct / 100))}<ChevronRight className="ic m0" /></span>
        )}
      </div>
      {v.zone && (
        <div className={css.zone}>
          {v.zone.icon === 'ban' ? <Ban className="ic" /> : <Target className="ic" />}
          {v.zone.text}
        </div>
      )}
      <div className={css.rule}>
        {c.strategy === 'trend' && <>EMA{c.ma_fast} <b>{st.pos_ma ? pr(st.pos_ma.fast) : '–'}</b> / EMA{c.ma_slow} <b>{st.pos_ma ? pr(st.pos_ma.slow) : '–'}</b> · </>}
        {c.strategy === 'rsi' && <>RSI actuel <b>{st.pos_rsi == null ? '–' : fm(st.pos_rsi, 1)}</b> · </>}
        {exitRule(c, v.tpPct, st)}
      </div>
    </>
  )
}

/** Trade en cours : masqué sans position. Vert/rouge selon que le prix est au-dessus ou sous l'entrée. */
export function OpenTradeCard() {
  const status = useBotStore((s) => s.status)
  const control = useBotStore((s) => s.control)
  if (!status || !status.state.qty) return null
  const { state: st, config: c } = status
  const v = computeOpenTrade(st, c)

  const liquidate = () => {
    const live = c.mode === 'live' ? '\nMODE LIVE : ordre réel sur Kraken.' : ''
    if (window.confirm(`Vendre toute la position au prix du marché maintenant ?${live}`)) void control('liquidate')
  }

  return (
    <Card
      title="Trade en cours"
      icon={Zap}
      className={`${css.card} ${v ? css[v.tone] : ''}`}
      actions={
        <Button variant="ko" size="title" onClick={liquidate}>
          <LogOut className="ic mr" />
          Liquider la position
        </Button>
      }
    >
      {v ? <Body st={st} c={c} v={v} /> : <div>Prix indisponible pour {pairLabel(st.pair ?? c.pair)}</div>}
    </Card>
  )
}
