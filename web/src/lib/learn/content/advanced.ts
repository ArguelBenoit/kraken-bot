/** Module 3 · Pour aller plus loin : éviter les pièges et garder les pieds sur terre. */
import type { Lesson } from '../lessonTypes'

export const ADVANCED: Lesson[] = [
  {
    id: 'a-filtre', module: 'avance', title: 'Ne pas nager à contre-courant : le filtre de tendance', minutes: 6,
    summary: `Une règle simple pour éviter beaucoup de mauvais achats.`,
    blocks: [
      { t: 'p', text: `Plusieurs méthodes (RSI, Bollinger) achètent après une **baisse**. Problème : si le marché est en pleine chute, acheter « parce que c'est moins cher » revient à ramasser un couteau qui tombe.` },
      { t: 'h', text: `Le filtre de tendance` },
      { t: 'p', text: `Un [[filtre|filtre de tendance]] ajoute une condition : **on n'achète que si le prix est au-dessus de sa [[sma|moyenne mobile]] longue** (par exemple sur 200 bougies). Autrement dit : on ne tente un rebond que dans un marché globalement haussier.` },
      { t: 'example', text: `Le RSI passe à 25 : signal d'achat. Mais le prix est très en dessous de sa moyenne sur 200 bougies (tendance baissière) : le filtre dit « on passe ». Tu évites un trade à haut risque.` },
      { t: 'pros', good: [`Évite beaucoup d'achats à contre-courant.`, `Réduit le nombre de pertes.`], bad: [`Tu rates aussi quelques bons rebonds.`, `Moins de signaux au total.`] },
      { t: 'callout', tone: 'tip', title: 'Dans le bot', text: `Le bot de ce projet propose ce filtre (réglage « Filtre EMA ») ainsi qu'un stop basé sur la volatilité (« Stop ATR »). Essaie-les en paper sur les autres pages quand tu seras à l'aise.` },
    ],
    quiz: [
      { q: `À quoi sert un filtre de tendance ?`, options: [`À éviter d'acheter quand le marché est globalement en baisse`, `À augmenter le nombre de trades`, `À supprimer les frais`], answer: 0, explain: `Il bloque les signaux d'achat qui vont à contre-courant de la tendance de fond.` },
    ],
  },
  {
    id: 'a-realite', module: 'avance', title: 'La réalité du trading', minutes: 7,
    summary: `Ce qu'aucune méthode ne peut te promettre, et les bonnes habitudes.`,
    blocks: [
      { t: 'p', text: `Tu connais maintenant six méthodes. Voici la partie la plus importante, et la moins excitante.` },
      { t: 'h', text: `Aucune méthode ne gagne tout le temps` },
      { t: 'list', items: [
        `Chaque méthode **gagne dans certaines conditions** (marché sans direction, ou forte tendance) et **perd dans d'autres**.`,
        `Dans les tests de ce projet, les résultats sont **mitigés** : une méthode peut gagner sur une période et perdre sur la suivante. Un bon test passé ne garantit pas le futur ([[backtest|backtest]]).`,
        `Les [[frais|frais]] (≈ 0,5 % l'aller-retour) grignotent les petits gains. Beaucoup de trades = beaucoup de frais.`,
      ] },
      { t: 'h', text: `Les vrais ennemis sont dans ta tête` },
      { t: 'list', items: [
        `La [[fomo|FOMO]] : acheter parce que « ça monte et je ne veux pas rater ça ».`,
        `Vouloir se « refaire » après une perte en doublant la mise : le plus sûr moyen de tout perdre.`,
        `Déplacer son stop loss plus bas parce qu'on « sent que ça va remonter ».`,
      ] },
      { t: 'callout', tone: 'key', title: 'Les règles d\'or', text: `1) Un stop loss à chaque trade. 2) Ne risquer que 1 à 2 % du capital par trade. 3) Pas de signal, pas de trade. 4) Tenir un journal : noter pourquoi on entre et sort. 5) S'entraîner en paper pendant des semaines avant tout argent réel — et alors seulement avec une somme que l'on peut se permettre de perdre.` },
      { t: 'callout', tone: 'warn', title: 'Ce que ce tutoriel n\'est pas', text: `Ce n'est pas un conseil financier, et il ne te rendra pas riche. Son but : te donner des réflexes sains et te faire comprendre comment raisonnent les méthodes.` },
    ],
    quiz: [
      { q: `Une méthode a très bien marché sur les 3 derniers mois. Que peut-on en conclure ?`, options: [`Qu'elle marchera aussi les 3 prochains mois`, `Rien de certain : elle a pu profiter de conditions favorables`, `Qu'il faut y mettre tout son capital`], answer: 1, explain: `Le passé ne garantit pas l'avenir. Chaque méthode a des conditions où elle brille et d'autres où elle perd.` },
      { q: `Après une perte, quelle est la meilleure réaction ?`, options: [`Doubler la mise pour se refaire`, `Respecter ses règles, noter ce qui s'est passé, et attendre le prochain signal`, `Arrêter le stop loss`], answer: 1, explain: `Vouloir se refaire d'un coup est la cause n°1 des grosses pertes. On reste discipliné.` },
    ],
  },
]
