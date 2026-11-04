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
    id: 'a-short', module: 'avance', title: 'Parier sur la baisse : le short', minutes: 7,
    summary: `Gagner quand le prix baisse… et pourquoi c'est plus dangereux.`,
    blocks: [
      { t: 'p', text: `Jusqu'ici, tu gagnais quand le prix **montait** ([[long|position longue]]). Mais un marché peut aussi baisser longtemps. Le [[short|short]] permet de gagner dans ce cas : c'est l'inverse d'un achat.` },
      { t: 'h', text: `Comment ça marche` },
      { t: 'steps', items: [
        `Tu **empruntes** de la crypto à la plateforme (c'est la [[marge|marge]]).`,
        `Tu la **vends** tout de suite, par exemple à 100.`,
        `Le prix baisse à 90 : tu la **rachètes** 90 et tu la rends. Tu gardes la différence : **+10**.`,
        `Mais si le prix monte à 110, tu la rachètes 110 : **−10**.`,
      ] },
      { t: 'example', text: `Short de 200 avec un levier ×2 : tu immobilises 100 de garantie. Si le prix baisse de 5 %, tu gagnes 10 (5 % de 200), soit +10 % de ta garantie. Si le prix monte de 5 %, tu perds 10 : −10 % de ta garantie.` },
      { t: 'h', text: `Pourquoi c'est plus risqué` },
      { t: 'list', items: [
        `**Perte non plafonnée** : un achat ne peut perdre que sa mise (le prix tombe à 0 au pire). Un short peut perdre bien plus, car le prix peut monter sans limite.`,
        `**Levier** : il multiplie les gains **et** les pertes.`,
        `**[[liquidation|Liquidation]]** : si le prix monte trop, la plateforme ferme ta position de force et tu perds ta garantie. À ×2, c'est vers +40 % ; à ×5, vers +16 %.`,
        `**Frais de report** toutes les 4 h tant que la position reste ouverte : un short n'est pas fait pour être oublié.`,
        `Les hausses brutales (« short squeeze ») sont fréquentes et rapides en crypto.`,
      ] },
      { t: 'callout', tone: 'key', title: 'Règles de survie', text: `1) Un stop loss **obligatoire**, bien en dessous du prix de liquidation. 2) Levier bas (×2). 3) Un short se prend dans une tendance baissière claire, jamais « parce que ça a trop monté ». 4) Petite taille, paper d'abord.` },
      { t: 'callout', tone: 'warn', title: 'Dans ce projet', text: `La page **Trading** permet le short en paper (stops inversés, liquidation et frais de marge simulés). En live il est désactivé par défaut : la marge Kraken n'a jamais été testée sur ton compte. Les exercices de ce tutoriel restent des achats.` },
    ],
    quiz: [
      { q: `Tu fais un short à 100. Le prix passe à 90. Que se passe-t-il ?`, options: [`Tu perds 10`, `Tu gagnes 10 (avant frais)`, `Rien : un short ne gagne jamais`], answer: 1, explain: `Tu as vendu à 100 et tu rachètes à 90 : la différence est ton gain. Un short gagne quand le prix baisse.` },
      { q: `Quel est le principal danger d'un short avec levier ?`, options: [`Les frais d'ouverture`, `La perte peut dépasser la mise et la position peut être liquidée si le prix monte`, `Il faut le garder au moins une semaine`], answer: 1, explain: `Le prix peut monter sans limite, et le levier amplifie la perte : d'où le stop loss obligatoire, placé bien avant la liquidation.` },
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
