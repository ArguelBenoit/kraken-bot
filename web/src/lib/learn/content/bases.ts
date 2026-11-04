/** Module 1 · Les bases : argent, bougies, gestion du risque. */
import type { Lesson } from '../lessonTypes'

export const BASES: Lesson[] = [
  {
    id: 'bases-argent', module: 'bases', title: 'Acheter, vendre, gagner (ou perdre)', minutes: 5,
    summary: `Ce qu'est vraiment le trading, avec un exemple chiffré.`,
    blocks: [
      { t: 'p', text: `Bienvenue ! Ici tu apprends à trader **sans jamais risquer un centime** : tout est simulé. On appelle ça le [[paper|paper trading]]. Pas de compte, pas d'argent réel, tu peux te tromper autant que tu veux.` },
      { t: 'h', text: `Le principe en 30 secondes` },
      { t: 'p', text: `Une [[crypto|cryptomonnaie]] comme le Bitcoin a un prix qui change en permanence. Trader, c'est **acheter quand le prix est bas, puis revendre quand il est plus haut**. La différence, c'est ton gain.` },
      { t: 'example', text: `Tu achètes pour 100 USDC de Bitcoin. Le prix monte de 5 %. Tu revends : tu récupères 105 USDC. **Gain : +5 USDC.** Et si le prix avait baissé de 5 % ? Tu récupères 95 : **perte de 5 USDC**.` },
      { t: 'callout', tone: 'key', title: 'À retenir', text: `Le trading, ce n'est pas deviner l'avenir. C'est avoir des **règles** pour décider quand entrer, quand sortir, et **limiter les pertes** quand on se trompe (ça arrive souvent, même aux pros).` },
      { t: 'h', text: `Les mots de base` },
      { t: 'list', items: [
        `Une [[paire|paire]] comme BTC/USDC : le prix d'un Bitcoin exprimé en [[stablecoin|stablecoin]] (≈ des dollars).`,
        `Une [[position|position]] : ce que tu détiens. « Être en position », c'est avoir acheté sans avoir revendu.`,
        `Un [[ordre-marche|ordre au marché]] : « achète tout de suite au prix actuel ». C'est ce qu'on utilise ici.`,
        `Le [[pnl|PnL]] : ton gain ou ta perte. Les [[frais|frais]] (≈ 0,26 % par ordre) sont toujours déduits.`,
      ] },
      { t: 'callout', tone: 'tip', title: 'Ici, on ne fait que acheter puis revendre', text: `C'est ce qu'on appelle une position [[long|longue]]. On ne parie jamais sur la baisse : c'est plus simple et plus sûr pour apprendre.` },
      { t: 'callout', tone: 'warn', title: 'Soyons honnêtes', text: `Trader est risqué et la majorité des débutants perd de l'argent. Ce tutoriel t'apprend des méthodes et de la discipline ; il ne promet aucun gain et ne constitue pas un conseil financier. Entraîne-toi longtemps ici avant d'envisager autre chose.` },
    ],
    quiz: [
      { q: `Tu achètes pour 100 USDC de Bitcoin, puis le prix baisse de 4 %. Si tu revends maintenant (sans compter les frais), tu récupères environ…`, options: [`104 USDC`, `96 USDC`, `100 USDC`], answer: 1, explain: `Le prix a baissé de 4 % : ta position vaut 4 % de moins, donc 96 USDC. Tu as perdu 4.` },
      { q: `Qu'est-ce que le paper trading ?`, options: [`Trader avec de l'argent fictif pour s'entraîner`, `Trader uniquement avec des chèques`, `Un type d'ordre spécial chez Kraken`], answer: 0, explain: `C'est une simulation : de vrais prix (ou données passées) mais de l'argent fictif. C'est ce que tu fais sur cette page.` },
    ],
    practice: { method: 'none', pair: 'XBTUSDC', tf: 240, instruction: `Premier essai libre : avance dans le temps, achète quand tu veux, puis revends. Pas de méthode ici, juste pour te familiariser avec les boutons.` },
  },
  {
    id: 'bases-bougies', module: 'bases', title: 'Lire un graphique en bougies', minutes: 6,
    summary: `Comprendre ce que raconte chaque bougie, et les mots « tendance », « support »…`,
    blocks: [
      { t: 'p', text: `Un graphique de trading est fait de **[[bougie|bougies]]**. Chaque bougie résume ce qu'a fait le prix pendant une durée fixe (1 heure, 4 heures, 1 jour…). C'est le [[timeframe|timeframe]].` },
      { t: 'h', text: `Anatomie d'une bougie` },
      { t: 'list', items: [
        `**Le corps** (le rectangle) va de l'[[ouverture|ouverture]] à la [[cloture|clôture]].`,
        `**Verte** : le prix a fini plus haut qu'il n'a commencé (il a monté). **Rouge** : il a fini plus bas (il a baissé).`,
        `**Les [[meche|mèches]]** (les traits fins) montrent le plus haut et le plus bas atteints pendant la période.`,
      ] },
      { t: 'widget', id: 'explore' },
      { t: 'h', text: `Ce que dit un enchaînement de bougies` },
      { t: 'list', items: [
        `[[tendance-hausse|Tendance haussière]] : le prix monte globalement, avec des sommets et des creux de plus en plus hauts.`,
        `[[tendance-baisse|Tendance baissière]] : l'inverse.`,
        `[[range|Marché sans direction]] : le prix oscille dans un couloir.`,
        `[[support|Support]] : un « plancher » sur lequel le prix a déjà rebondi. [[resistance|Résistance]] : un « plafond » qu'il a déjà du mal à franchir.`,
      ] },
      { t: 'callout', tone: 'tip', title: 'Choisir sa durée de bougie', text: `Des bougies courtes (1 h) bougent beaucoup et donnent plein de signaux, dont beaucoup de faux. Des bougies longues (4 h, 1 jour) sont plus calmes et plus fiables. Pour débuter : **4 heures**.` },
    ],
    quiz: [
      { q: `Une bougie est rouge. Que s'est-il passé pendant cette période ?`, options: [`Le prix a fini plus bas qu'il n'a commencé`, `Le prix a fini plus haut qu'il n'a commencé`, `Il ne s'est rien passé`], answer: 0, explain: `Rouge = la clôture est sous l'ouverture : le prix a baissé sur la période.` },
      { q: `À quoi servent les mèches ?`, options: [`À décorer la bougie`, `À montrer le plus haut et le plus bas atteints`, `À indiquer le volume échangé`], answer: 1, explain: `La mèche du haut montre jusqu'où le prix est monté, celle du bas jusqu'où il est descendu, avant de revenir.` },
    ],
    practice: { method: 'none', pair: 'ETHUSDC', tf: 240, instruction: `Observe le graphique : repère les tendances, les bougies vertes et rouges. Avance de quelques bougies et vois comment le prix se comporte.` },
  },
  {
    id: 'bases-risque', module: 'bases', title: 'Se protéger : stop loss, objectif et risque', minutes: 7,
    summary: `La règle n°1 du trading : limiter ce qu'on peut perdre.`,
    blocks: [
      { t: 'p', text: `Aucune méthode n'a raison à tous les coups. Ce qui fait la différence sur la durée, ce n'est pas d'avoir toujours raison : c'est de **perdre peu quand on a tort**. Trois outils pour ça.` },
      { t: 'h', text: `Le stop loss : ton filet de sécurité` },
      { t: 'p', text: `Un [[stop-loss|stop loss]] est un seuil de perte que tu fixes **avant** d'acheter. Si le prix descend jusque-là, la position est vendue automatiquement, sans que tu aies à décider sous le stress.` },
      { t: 'example', text: `Tu achètes à 100 avec un stop loss à −3 %. Si le prix tombe à 97, tu sors avec une petite perte de 3. Sans stop, tu pourrais regarder le prix tomber à 80 en espérant qu'il remonte.` },
      { t: 'h', text: `L'objectif et le stop suiveur` },
      { t: 'list', items: [
        `Le [[take-profit|take profit]] : tu vends automatiquement quand le gain atteint un niveau (par ex. +5 %).`,
        `Le [[stop-suiveur|stop suiveur]] : un stop qui remonte avec le prix, pour protéger les gains tout en laissant la hausse continuer.`,
      ] },
      { t: 'h', text: `Le ratio gain / risque` },
      { t: 'p', text: `Le [[ratio|ratio gain/risque]] compare ce que tu peux gagner à ce que tu risques. Risquer 3 % pour viser 6 % = **2 pour 1**. Avec un bon ratio, tu peux avoir tort la moitié du temps et quand même gagner.` },
      { t: 'widget', id: 'risk' },
      { t: 'callout', tone: 'key', title: 'La règle des 1 à 2 %', text: `Ne risque jamais plus de **1 à 2 % de ton capital** sur un seul trade (c'est la [[taille-position|taille de position]]). Avec 1 000 € de capital, une perte maximale de 10 à 20 € par trade. Ainsi, une série de mauvais trades ne te ruine pas.` },
    ],
    quiz: [
      { q: `Tu risques 2 € pour viser un gain de 6 €. Quel est ton ratio gain/risque ?`, options: [`1 pour 3 (mauvais)`, `3 pour 1 (bon)`, `2 pour 6`], answer: 1, explain: `6 ÷ 2 = 3 : tu peux gagner 3 fois ce que tu risques. C'est un bon ratio.` },
      { q: `Quand faut-il choisir son stop loss ?`, options: [`Avant d'acheter`, `Quand le prix commence à baisser`, `Jamais, c'est inutile`], answer: 0, explain: `Avant, à tête reposée. Décider en pleine panique mène presque toujours à de mauvais choix.` },
    ],
    practice: { method: 'none', pair: 'SOLUSDC', tf: 240, instruction: `Entraîne-toi à poser un stop loss (3 %) et un objectif (5 %) à chaque achat. Regarde ce qu'ils déclenchent quand tu avances.` },
  },
]
