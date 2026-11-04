import type { MethodId } from './methods'

/** Contenu du cours. Dans les textes : `[[id|texte]]` = mot du glossaire cliquable, `**gras**`. Écrit pour un débutant complet. */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'steps'; items: string[] }
  | { t: 'callout'; tone: 'tip' | 'warn' | 'key'; title: string; text: string }
  | { t: 'example'; text: string }
  | { t: 'rules'; buy: string[]; sell: string[] }
  | { t: 'pros'; good: string[]; bad: string[] }
  | { t: 'widget'; id: 'explore' | 'risk' }

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  explain: string
}

export type ModuleId = 'bases' | 'methodes' | 'avance'

export interface Lesson {
  id: string
  module: ModuleId
  title: string
  summary: string
  minutes: number
  /** Leçon d'une méthode : son épreuve se valide dans l'exercice. */
  method?: MethodId
  blocks: Block[]
  quiz: QuizQuestion[]
  practice?: { method: MethodId | 'none'; pair: string; tf: number; instruction: string }
}

export const MODULES: { id: ModuleId; title: string; intro: string }[] = [
  { id: 'bases', title: '1 · Les bases', intro: `Comprendre ce qu'on fait, lire un graphique, et se protéger. Rien de compliqué.` },
  { id: 'methodes', title: '2 · Les 6 méthodes (épreuves)', intro: `Chaque méthode est une façon de décider « quand acheter, quand vendre ». Pour chacune : une leçon, un quiz, puis un trade d'entraînement. Objectif : les valider toutes.` },
  { id: 'avance', title: '3 · Pour aller plus loin', intro: `Éviter les pièges et garder les pieds sur terre.` },
]

/** Étapes de l'épreuve, rappelées à la fin de chaque leçon de méthode. */
const TRIAL_STEPS = [
  `**Réussis le quiz** (à l'étape suivante de ce chapitre).`,
  `À l'étape **« Épreuve »**, clique sur **« Démarrer l’exercice »** : on te donne un vrai moment passé du marché, dont tu ne connais pas la suite.`,
  `Clique sur **« Aller au prochain signal »** (ou avance bougie par bougie) jusqu'à ce que la méthode donne un **signal d'achat** : le coach te le dit. Choisis un **stop loss**, puis **achète**.`,
  `**Clôture** le trade : vends toi-même, ou laisse le stop, l'objectif ou le signal de sortie le faire. L'épreuve est validée !`,
]

export const LESSONS: Lesson[] = [
  // ───────────────────────── 1 · LES BASES ─────────────────────────
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

  // ───────────────────────── 2 · LES MÉTHODES ─────────────────────────
  {
    id: 'm-rsi', module: 'methodes', method: 'rsi', title: 'Méthode 1 : le RSI (acheter les creux)', minutes: 8,
    summary: `Acheter quand le prix a trop baissé, revendre quand il a rebondi.`,
    blocks: [
      { t: 'p', text: `Imagine un élastique. Quand tu l'étires trop vers le bas, il a tendance à revenir. Le **[[rsi|RSI]]** essaie de mesurer cet étirement pour le prix.` },
      { t: 'h', text: `C'est quoi, le RSI ?` },
      { t: 'p', text: `C'est un [[indicateur|indicateur]] : un chiffre de **0 à 100**, calculé sur les 14 dernières bougies, qui compare la force des hausses récentes à celle des baisses récentes.` },
      { t: 'list', items: [
        `Proche de **100** : le prix vient de beaucoup monter → on parle de [[surachat|surachat]].`,
        `Proche de **0** : le prix vient de beaucoup baisser → on parle de [[survente|survente]].`,
        `Autour de **50** : rien de remarquable.`,
        `Par convention : sous **30** = survente, au-dessus de **70** = surachat.`,
      ] },
      { t: 'h', text: `La règle` },
      { t: 'rules', buy: [`Le RSI descend à **30 ou moins** (signal d'achat).`, `Tu choisis un stop loss (par ex. 3 %) avant d'acheter.`], sell: [`Le RSI remonte à **70 ou plus**, ou`, `ton stop loss / ton objectif est atteint.`] },
      { t: 'example', text: `Le prix de l'Ethereum chute pendant plusieurs jours. Le RSI tombe à 24 : la méthode dit « achète, ça a trop baissé ». Quelques jours plus tard le prix a rebondi, le RSI atteint 71 : « vends ».` },
      { t: 'pros', good: [`Efficace quand le marché oscille (monte et descend dans un couloir).`, `Règle simple et claire.`], bad: [`Dans une vraie chute, le RSI peut rester sous 30 pendant des jours : tu achètes « trop tôt » et le prix continue de baisser (on dit qu'on « rattrape un couteau qui tombe »).`, `Donne peu de signaux sur de grosses bougies.`] },
      { t: 'callout', tone: 'warn', title: 'Un RSI bas ne garantit rien', text: `C'est un [[faux-signal|faux signal]] possible. C'est exactement pour ça que le stop loss est obligatoire dans l'épreuve.` },
      { t: 'h', text: `Ton épreuve` },
      { t: 'steps', items: TRIAL_STEPS },
    ],
    quiz: [
      { q: `Le RSI vaut 22. Que dit la méthode ?`, options: [`Vendre : le prix est en surachat`, `Acheter : le prix a beaucoup baissé (survente)`, `Ne rien faire, 22 est normal`], answer: 1, explain: `Sous 30, c'est la survente : la méthode considère que le prix a trop baissé et peut rebondir.` },
      { q: `Pourquoi mettre un stop loss avec cette méthode ?`, options: [`Parce que le RSI peut rester bas et le prix continuer à chuter`, `Parce que c'est obligatoire par la loi`, `Pour payer moins de frais`], answer: 0, explain: `Dans une forte baisse, le RSI reste bas longtemps. Le stop limite la casse si la méthode se trompe.` },
    ],
    practice: { method: 'rsi', pair: 'ETHUSDC', tf: 240, instruction: `Cherche un moment où le RSI passe sous 30, puis achète avec un stop loss.` },
  },
  {
    id: 'm-bollinger', module: 'methodes', method: 'bollinger', title: 'Méthode 2 : les bandes de Bollinger', minutes: 8,
    summary: `Acheter quand le prix sort de son « couloir » par le bas.`,
    blocks: [
      { t: 'p', text: `Pense à un chien tenu en laisse : il peut s'éloigner de son maître, mais pas indéfiniment, il finit par revenir. Les **[[bollinger|bandes de Bollinger]]** dessinent la longueur de la laisse autour du prix.` },
      { t: 'h', text: `Comment ça marche` },
      { t: 'list', items: [
        `Au milieu : une [[sma|moyenne mobile]] sur 20 bougies (le prix « normal » du moment).`,
        `Au-dessus et en dessous : deux bandes, placées à 2 [[ecart-type|écarts-types]] de la moyenne. Elles s'écartent quand le prix s'agite, se resserrent quand il est calme.`,
        `La plupart du temps, le prix reste entre les deux bandes. Quand il en sort, c'est inhabituel.`,
      ] },
      { t: 'h', text: `La règle` },
      { t: 'rules', buy: [`Le prix **clôture sous la bande basse** : il s'est « trop » éloigné de sa moyenne vers le bas.`, `Stop loss choisi avant d'acheter.`], sell: [`Le prix **revient à la moyenne** (la ligne du milieu), ou`, `ton stop loss / ton objectif est atteint.`] },
      { t: 'example', text: `Le prix s'effondre brusquement et clôture sous la bande basse. La méthode achète le « rebond » attendu. Quelques bougies plus tard, le prix remonte jusqu'à la ligne du milieu : elle vend.` },
      { t: 'pros', good: [`Bien adaptée aux marchés sans direction.`, `S'adapte à la volatilité : les bandes s'élargissent quand ça bouge plus.`], bad: [`Dans une forte baisse, le prix peut « marcher » le long de la bande basse en continuant de descendre.`, `Les gains sont petits (on vend dès la moyenne) alors que la perte peut être plus grosse : le stop est vital.`] },
      { t: 'h', text: `Ton épreuve` },
      { t: 'steps', items: TRIAL_STEPS },
    ],
    quiz: [
      { q: `Le prix clôture sous la bande basse de Bollinger. Que signale la méthode ?`, options: [`Un achat (le prix s'est trop éloigné de sa moyenne)`, `Une vente`, `Rien du tout`], answer: 0, explain: `Sortir sous la bande basse = étirement excessif vers le bas : la méthode parie sur un retour vers la moyenne.` },
      { q: `Où cette méthode vend-elle ?`, options: [`À la bande haute`, `Quand le prix revient à la moyenne (ligne du milieu)`, `Après exactement 10 bougies`], answer: 1, explain: `La cible, c'est le retour à la moyenne. Les gains sont modestes mais plus fréquents.` },
    ],
    practice: { method: 'bollinger', pair: 'ETHUSDC', tf: 240, instruction: `Attends que le prix clôture sous la bande basse (violette, en bas), puis achète avec un stop loss.` },
  },
  {
    id: 'm-trend', module: 'methodes', method: 'trend', title: 'Méthode 3 : la tendance (croisement de moyennes)', minutes: 9,
    summary: `Suivre le courant : acheter quand la hausse s'installe.`,
    blocks: [
      { t: 'p', text: `Au lieu d'essayer d'acheter au plus bas, cette méthode **suit le courant** : elle attend qu'une hausse soit bien lancée, et monte dans le train en marche.` },
      { t: 'h', text: `Deux moyennes, une rapide et une lente` },
      { t: 'p', text: `Une [[ema|moyenne mobile exponentielle (EMA)]] lisse les prix pour montrer la direction générale. On en trace deux : une **rapide** (20 bougies), qui colle au prix, et une **lente** (50 bougies), qui réagit plus doucement.` },
      { t: 'list', items: [
        `Quand la rapide passe **au-dessus** de la lente : la hausse prend le dessus.`,
        `Quand elle repasse **en dessous** : la baisse reprend la main.`,
        `Ce moment où les deux lignes se traversent s'appelle un [[croisement|croisement]].`,
      ] },
      { t: 'h', text: `La règle` },
      { t: 'rules', buy: [`La moyenne rapide **croise la lente vers le haut** (signal d'achat).`, `Stop loss choisi avant d'acheter (plus large : 5 %).`], sell: [`La moyenne rapide **repasse sous la lente**, ou`, `ton stop loss est atteint.`] },
      { t: 'pros', good: [`Peut capter de longues hausses : quelques trades gagnants très rentables.`, `Peu de trades : peu de frais, moins de stress.`], bad: [`**En retard** : le croisement arrive après le début du mouvement, et la sortie après le sommet.`, `Dans un marché sans direction, les lignes se croisent sans arrêt : série de petites pertes (les « fausses alertes »).`] },
      { t: 'callout', tone: 'tip', title: 'Ne t’étonne pas d’attendre', text: `Cette méthode donne peu de signaux. Si tu n'en vois pas, avance de plusieurs bougies d'un coup (« +5 »). La patience fait partie de la méthode.` },
      { t: 'h', text: `Ton épreuve` },
      { t: 'steps', items: TRIAL_STEPS },
    ],
    quiz: [
      { q: `La moyenne rapide (bleue) passe au-dessus de la lente (violette). Que fait la méthode ?`, options: [`Elle achète`, `Elle vend`, `Elle attend 10 bougies`], answer: 0, explain: `Le croisement vers le haut signale que la hausse prend le dessus : c'est le signal d'achat.` },
      { q: `Dans quelle situation cette méthode se fait-elle piéger ?`, options: [`Dans une forte tendance`, `Dans un marché sans direction, où les lignes se croisent sans arrêt`, `Quand il y a beaucoup de volume`], answer: 1, explain: `Sans tendance claire, les croisements sont des faux signaux : on achète puis on revend à perte, encore et encore.` },
    ],
    practice: { method: 'trend', pair: 'XBTUSDC', tf: 240, instruction: `Avance jusqu'à ce que la ligne bleue croise la violette vers le haut. Ça peut demander quelques dizaines de bougies : utilise « +5 ».` },
  },
  {
    id: 'm-donchian', module: 'methodes', method: 'donchian', title: 'Méthode 4 : la cassure (canal de Donchian)', minutes: 8,
    summary: `Acheter quand le prix bat un record récent.`,
    blocks: [
      { t: 'p', text: `Quand un athlète bat un record, il est en forme. Quand le prix dépasse son plus haut des dernières semaines, c'est souvent le signe d'un nouvel élan : on appelle ça une **[[cassure|cassure]]**.` },
      { t: 'h', text: `Le canal de Donchian` },
      { t: 'p', text: `On trace le plus haut des 20 dernières bougies (ligne verte) et le plus bas des 10 dernières (ligne rouge) : c'est le [[donchian|canal de Donchian]]. Tant que le prix reste dedans, rien ne se passe.` },
      { t: 'h', text: `La règle` },
      { t: 'rules', buy: [`Le prix **dépasse le plus haut des 20 dernières bougies** (cassure vers le haut).`, `Stop loss choisi avant d'acheter.`], sell: [`Le prix **passe sous le plus bas des 10 dernières bougies**, ou`, `ton stop loss est atteint.`] },
      { t: 'pros', good: [`Attrape les gros mouvements dès leur début.`, `Règle objective : un niveau est franchi ou non.`], bad: [`Beaucoup de **faux départs** : le prix dépasse le sommet puis retombe aussitôt.`, `On achète « cher » (au plus haut), donc le stop peut être touché vite.`] },
      { t: 'h', text: `Ton épreuve` },
      { t: 'steps', items: TRIAL_STEPS },
    ],
    quiz: [
      { q: `Quel est le signal d'achat de cette méthode ?`, options: [`Le prix dépasse le plus haut des 20 dernières bougies`, `Le prix passe sous son plus bas`, `Le RSI passe sous 30`], answer: 0, explain: `Un nouveau plus haut sur 20 bougies est une cassure : la méthode y voit le début d'un élan.` },
      { q: `Qu'est-ce qu'un faux départ ?`, options: [`Une cassure qui échoue : le prix retombe aussitôt`, `Un ordre mal envoyé`, `Une bougie sans mèche`], answer: 0, explain: `Toutes les cassures ne se prolongent pas. Un stop loss serré limite le coût de ces échecs.` },
    ],
    practice: { method: 'donchian', pair: 'SOLUSDC', tf: 240, instruction: `Attends que le prix franchisse la ligne verte (plus haut des 20 dernières bougies), puis achète avec un stop loss.` },
  },
  {
    id: 'm-macd', module: 'methodes', method: 'macd', title: 'Méthode 5 : le MACD', minutes: 9,
    summary: `Mesurer l'élan du prix avec deux lignes.`,
    blocks: [
      { t: 'p', text: `Le **[[macd|MACD]]** mesure si le prix est en train d'accélérer vers le haut ou vers le bas, comme le tachymètre d'une voiture : il ne donne pas la position, mais la vitesse.` },
      { t: 'h', text: `Comment le lire` },
      { t: 'list', items: [
        `**Ligne MACD (bleue)** : la différence entre une [[ema|EMA]] rapide (12) et une EMA lente (26). Positive si le prix monte plus vite que sa tendance.`,
        `**Ligne signal (orange)** : une moyenne de la ligne MACD elle-même (9 bougies). Elle réagit plus lentement.`,
        `**Barres (histogramme)** : l'écart entre les deux lignes. Vertes = MACD au-dessus du signal (élan haussier), rouges = en dessous.`,
        `Quand la ligne bleue traverse l'orange, c'est un [[croisement|croisement]].`,
      ] },
      { t: 'h', text: `La règle` },
      { t: 'rules', buy: [`La ligne MACD **croise son signal vers le haut** (les barres passent du négatif au positif).`, `Stop loss choisi avant d'acheter.`], sell: [`La ligne MACD **repasse sous son signal**, ou`, `ton stop loss est atteint.`] },
      { t: 'pros', good: [`Montre quand l'élan du marché change.`, `Un seul coup d'œil suffit : lignes et barres.`], bad: [`Comme toutes les méthodes de croisement, elle est **en retard**.`, `Beaucoup de faux signaux quand le prix fait du surplace.`] },
      { t: 'h', text: `Ton épreuve` },
      { t: 'steps', items: TRIAL_STEPS },
    ],
    quiz: [
      { q: `La ligne MACD (bleue) croise la ligne signal (orange) vers le haut. Que signale la méthode ?`, options: [`Un achat : l'élan devient haussier`, `Une vente`, `Rien, il faut attendre le RSI`], answer: 0, explain: `Quand le MACD passe au-dessus de son signal, l'élan haussier prend le dessus : c'est le signal d'achat.` },
      { q: `Que représentent les barres sous le graphique ?`, options: [`Le volume échangé`, `L'écart entre la ligne MACD et son signal`, `Le prix de clôture`], answer: 1, explain: `C'est l'histogramme : MACD − signal. Il devient positif quand le MACD passe au-dessus de son signal.` },
    ],
    practice: { method: 'macd', pair: 'ETHUSDC', tf: 240, instruction: `Guette le moment où la ligne bleue passe au-dessus de l'orange (barres qui deviennent vertes), puis achète avec un stop loss.` },
  },
  {
    id: 'm-momentum', module: 'methodes', method: 'momentum', title: 'Méthode 6 : le momentum (suivre la force)', minutes: 7,
    summary: `Acheter ce qui monte déjà fort, tant que ça n'est pas surchauffé.`,
    blocks: [
      { t: 'p', text: `Une voiture lancée à vitesse élevée ne s'arrête pas d'un coup. Le **[[momentum|momentum]]** (l'élan) part du même principe : ce qui monte fort a tendance à continuer un moment.` },
      { t: 'h', text: `Comment c'est mesuré` },
      { t: 'p', text: `Très simplement : de combien le prix a-t-il varié sur les 24 dernières bougies ? C'est la ligne bleue sous le graphique. Si elle dépasse **+3 %**, l'élan est là.` },
      { t: 'h', text: `La règle` },
      { t: 'rules', buy: [`Le prix a **gagné au moins 3 %** sur les 24 dernières bougies,`, `et le [[rsi|RSI]] est **sous 80** (on évite d'acheter ce qui est déjà en surchauffe).`, `Stop loss choisi avant d'acheter.`], sell: [`La variation sur 24 bougies **redevient négative**, ou`, `ton stop loss est atteint.`] },
      { t: 'pros', good: [`Attrape de vrais mouvements haussiers.`, `Règle très facile à vérifier.`], bad: [`Risque d'acheter **tout en haut**, juste avant que ça retombe.`, `Un marché qui a déjà beaucoup monté peut se retourner brutalement : le stop est indispensable.`] },
      { t: 'callout', tone: 'warn', title: 'Attention à la FOMO', text: `Cette méthode ressemble à ce que fait un débutant pris par la [[fomo|FOMO]] (« ça monte, j'achète vite ! »). La différence : une règle précise, un stop loss, et la discipline de ne rien faire sans signal.` },
      { t: 'h', text: `Ton épreuve` },
      { t: 'steps', items: TRIAL_STEPS },
    ],
    quiz: [
      { q: `Le prix a gagné 5 % sur les 24 dernières bougies et le RSI vaut 60. Que dit la méthode ?`, options: [`Acheter (élan haussier, pas de surchauffe)`, `Vendre`, `Attendre`], answer: 0, explain: `+5 % dépasse le seuil de 3 % et le RSI est bien sous 80 : toutes les conditions d'achat sont réunies.` },
      { q: `Quel est le principal danger de cette méthode ?`, options: [`Acheter tout en haut, juste avant un retournement`, `Ne jamais donner de signal`, `Payer trop de frais`], answer: 0, explain: `Acheter après une forte hausse expose à un retournement. C'est pourquoi on place toujours un stop loss.` },
    ],
    practice: { method: 'momentum', pair: 'SOLUSDC', tf: 240, instruction: `Attends que la variation sur 24 bougies dépasse +3 % (la ligne bleue passe au-dessus du trait vert), puis achète avec un stop loss.` },
  },

  // ───────────────────────── 3 · ALLER PLUS LOIN ─────────────────────────
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

export const LESSON_BY_ID: Record<string, Lesson> = Object.fromEntries(LESSONS.map((l) => [l.id, l]))
export const METHOD_LESSON: Partial<Record<MethodId, Lesson>> = Object.fromEntries(LESSONS.filter((l) => l.method).map((l) => [l.method as MethodId, l]))
