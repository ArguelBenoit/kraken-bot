/** Le coach commente l'exercice en direct, en langage simple : où on en est et quoi faire ensuite. */
export interface CoachContext {
  method: { name: string; buyRule: string; sellRule: string } | null
  signalBuy: boolean
  signalSell: boolean
  /** Lecture de l'indicateur à la bougie courante. */
  info: string
  hasPosition: boolean
  positionHasStop: boolean
  pnlPct: number | null
  finished: boolean
}

export interface Coach {
  tone: 'info' | 'good' | 'warn'
  title: string
  text: string
}

export function coach(c: CoachContext): Coach {
  if (c.finished) return { tone: 'info', title: 'Exercice terminé', text: `Regarde le bilan ci-dessous : il compare ton résultat au simple fait d'acheter et d'attendre, et vérifie si tu as respecté la méthode.` }

  if (!c.method) {
    if (!c.hasPosition) return { tone: 'info', title: 'Tu es sorti du marché', text: `Tu ne détiens rien. Avance dans le temps avec « Bougie suivante », et achète quand tu penses que le prix va monter. Pense au stop loss avant d'acheter.` }
    return { tone: c.positionHasStop ? 'info' : 'warn', title: 'Tu es en position', text: c.positionHasStop ? `Ton stop loss te protège. Avance et vends quand tu veux, ou laisse le stop / l'objectif agir.` : `Tu n'as pas de stop loss : si le prix chute, rien ne t'arrêtera. Vends ou, la prochaine fois, choisis un stop avant d'acheter.` }
  }

  if (!c.hasPosition) {
    if (c.signalBuy) return { tone: 'good', title: '✔ Signal d’achat !', text: `La méthode dit : achète quand ${c.method.buyRule}. C'est le cas maintenant. Choisis d'abord un **stop loss**, puis clique sur « Acheter ».` }
    return { tone: 'info', title: 'Pas de signal : on attend', text: `${c.info ? c.info + '. ' : ''}La méthode n'achète que quand ${c.method.buyRule}. Ce n'est pas encore le cas : un bon trader sait ne rien faire. Clique sur « Bougie suivante » (ou « +5 »).` }
  }

  if (!c.positionHasStop) return { tone: 'warn', title: 'Pas de stop loss !', text: `Tu as acheté sans stop loss : si la méthode se trompe, rien ne limite ta perte. Dans l'épreuve, le stop est obligatoire. Tu peux vendre maintenant et recommencer avec un stop.` }
  if (c.signalSell) return { tone: 'good', title: '✔ Signal de vente', text: `La méthode dit : vends quand ${c.method.sellRule}. C'est le cas maintenant : clique sur « Vendre » pour clôturer ton trade.` }
  const sign = c.pnlPct == null ? '' : c.pnlPct >= 0 ? `Tu es en gain de ${c.pnlPct.toFixed(1)} %. ` : `Tu es en perte de ${Math.abs(c.pnlPct).toFixed(1)} %. `
  return { tone: 'info', title: 'Trade en cours', text: `${sign}La méthode ne dit pas de vendre : elle vend quand ${c.method.sellRule}. Ton stop loss te protège. Avance bougie par bougie.` }
}
