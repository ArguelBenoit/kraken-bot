/** Module 2 · Les 6 méthodes : une leçon, un quiz et une épreuve chacune. */
import type { Lesson } from '../lessonTypes'

/** Étapes de l'épreuve, rappelées à la fin de chaque leçon de méthode. */
const TRIAL_STEPS = [
  `**Réussis le quiz** (à l'étape suivante de ce chapitre).`,
  `À l'étape **« Épreuve »**, clique sur **« Démarrer l’exercice »** : on te donne un vrai moment passé du marché, dont tu ne connais pas la suite.`,
  `Clique sur **« Aller au prochain signal »** (ou avance bougie par bougie) jusqu'à ce que la méthode donne un **signal d'achat** : le coach te le dit. Choisis un **stop loss**, puis **achète**.`,
  `**Clôture** le trade : vends toi-même, ou laisse le stop, l'objectif ou le signal de sortie le faire. L'épreuve est validée !`,
]

export const METHOD_LESSONS: Lesson[] = [
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
]
