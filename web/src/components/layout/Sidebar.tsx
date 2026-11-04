import { Bot, ChartCandlestick, Coins, Crosshair, GraduationCap, Play, Square, Zap, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { zapTone, type ZapTone } from '@/lib/activity'
import type { Activity } from '@/lib/types'
import { useActivityStore } from '@/stores/activityStore'
import css from './Sidebar.module.css'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Infobulle au survol / focus clavier. */
  tip?: string
  /** Entrée qui gère des positions : affiche en bout de ligne « position ouverte » et « bot en marche ». */
  activity?: 'bot' | 'ai' | 'manual'
}

/** Groupes du menu : ajouter une page = une ligne ici + une route dans App.tsx. « Apprendre » est volontairement à part. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Trading',
    items: [
      {
        to: '/', label: 'Bot simple', icon: ChartCandlestick, activity: 'bot',
        tip: "Un bot qui trade tout seul, une paire à la fois, avec la méthode de ton choix (RSI, tendance, Bollinger, cassure, MACD, momentum). Tu règles les seuils ; il achète et vend selon les signaux.",
      },
      {
        to: '/ai', label: 'Bot IA', icon: Bot, activity: 'ai',
        tip: "Claude analyse régulièrement le marché et ouvre jusqu'à 5 trades en parallèle, avec les stratégies que tu autorises. Le code impose les garde-fous : stop loss, exposition max, perte journalière max.",
      },
      {
        to: '/trading', label: 'Trading', icon: Crosshair, activity: 'manual',
        tip: "Du trading à la main : tu observes le marché et tu passes toi-même tes ordres (marché ou limite), avec stop loss, take profit et stop suiveur par position. Plusieurs positions possibles.",
      },
    ],
  },
  {
    label: 'Apprendre',
    items: [
      {
        to: '/learn', label: 'Tutoriel', icon: GraduationCap,
        tip: "Apprendre le trading pas à pas, sans risque : leçons simples, glossaire, et un simulateur qui rejoue de vrais moments du marché. 6 épreuves à valider, une par méthode. 100 % paper : aucun ordre réel.",
      },
    ],
  },
]

/** Lecture de l'activité d'une entrée : positions ouvertes, et pour les bots s'ils tournent (le trading manuel n'a pas d'interrupteur). */
function read(key: NonNullable<NavItem['activity']>, a: Activity) {
  const positions = a[key].positions
  const running = key === 'manual' ? null : a[key].running
  const pending = key === 'manual' ? a.manual.pending : 0
  const parts = [
    running == null ? null : running ? 'bot en marche' : 'bot arrêté',
    positions ? `${positions} position${positions > 1 ? 's' : ''} ouverte${positions > 1 ? 's' : ''} (${a[key].gain} en gain, ${a[key].loss} en perte)` : 'aucune position',
    pending ? `${pending} ordre${pending > 1 ? 's' : ''} limite en attente` : null,
  ].filter(Boolean)
  // « ordre » : une position ouverte, ou (trading manuel) un ordre limite en attente
  return { orders: positions + pending, tone: zapTone(a[key].gain, a[key].loss), running, summary: `État : ${parts.join(' · ')}.` }
}

/** Pastilles de bout de ligne : ⚡ = au moins un ordre, vert / rouge / orange selon les positions en gain / en perte ; ▶ vert = le bot tourne, ■ gris = il est arrêté. */
function Indicators({ orders, tone, running }: { orders: number; tone: ZapTone; running: boolean | null }) {
  return (
    <span className={css.badges} aria-hidden>
      {orders > 0 && <Zap className={`ic f ${css.zap} ${css[tone]}`} />}
      {running === true && <Play className={`ic f ${css.play}`} />}
      {running === false && <Square className={`ic f ${css.stopped}`} />}
    </span>
  )
}

export function Sidebar() {
  const activity = useActivityStore((s) => s.activity)
  return (
    <aside className={css.sidebar}>
      <div className={css.brand}>
        <Coins className="ic" />
        Kraken Bot
      </div>
      <nav className={css.nav} aria-label="Menu principal">
        {NAV_GROUPS.map((g) => (
          <div key={g.label} className={css.group}>
            <div className={css.label}>{g.label}</div>
            {g.items.map(({ to, label, icon: Icon, tip, activity: key }) => {
              const st = key && activity ? read(key, activity) : null
              return (
                <NavLink
                  key={to} to={to} end={to === '/'} data-tip={tip && st ? `${tip}\n\n${st.summary}` : tip}
                  aria-label={st ? `${label} — ${st.summary}` : label}
                  className={({ isActive }) => `${css.link} ${isActive ? css.active : ''}`}
                >
                  <Icon className="ic" />
                  {label}
                  {st && <Indicators orders={st.orders} tone={st.tone} running={st.running} />}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className={css.footer}>Kraken · spot</div>
    </aside>
  )
}
