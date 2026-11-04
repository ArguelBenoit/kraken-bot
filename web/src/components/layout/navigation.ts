import { Bot, ChartCandlestick, Crosshair, GraduationCap, type LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Infobulle au survol / focus clavier. */
  tip: string
  /** Entrée qui gère des positions : affiche en bout de ligne « ordre ouvert » et « bot en marche ». */
  activity?: 'bot' | 'ai' | 'manual'
}

/** Groupes du menu : ajouter une page = une entrée ici + une route dans App.tsx. « Apprendre » est volontairement à part. */
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
