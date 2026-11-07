import { Bot, Crosshair, GraduationCap, type LucideIcon } from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Infobulle au survol / focus clavier. */
  tip: string
  /** Entrée qui gère des positions : affiche en bout de ligne « ordre ouvert » et « bot en marche ». */
  activity?: 'ai' | 'manual'
}

/** Groupes du menu : ajouter une page = une entrée ici + une route dans App.tsx. « Apprendre » est volontairement à part. */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Trading',
    items: [
      {
        to: '/', label: 'Trading', icon: Crosshair, activity: 'manual',
        tip: "La page d'accueil : tu observes le marché et tu passes toi-même tes ordres (marché ou limite), avec stop loss, take profit et stop suiveur par position. Le modèle (Claude, GPT, Gemini…) peut te proposer des trades à prendre maintenant ; rien n'est envoyé sans ton clic.",
      },
      {
        to: '/ai', label: 'Bot IA', icon: Bot, activity: 'ai',
        tip: "Le modèle de ton choix analyse régulièrement le marché et ouvre jusqu'à 5 trades en parallèle, avec les stratégies que tu autorises. Le code impose les garde-fous : stop loss, exposition max, perte journalière max.",
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
