/** Couleur de l'éclair d'un menu : vert si plus de positions en gain qu'en perte, rouge si plus en perte, orange si autant (ou aucune position valorisée). */
export type ZapTone = 'up' | 'down' | 'flat'

export const zapTone = (gain: number, loss: number): ZapTone => (gain > loss ? 'up' : loss > gain ? 'down' : 'flat')
