/** Couleur de l'éclair d'un menu : vert si plus de positions en gain qu'en perte, rouge si plus en perte, orange si autant,
 *  gris « inconnu » si le serveur ne fournit pas les gains/pertes (ancienne version du serveur Python : à redémarrer). */
export type ZapTone = 'up' | 'down' | 'flat' | 'unknown'

export const zapTone = (gain?: number, loss?: number): ZapTone =>
  typeof gain !== 'number' || typeof loss !== 'number' ? 'unknown' : gain > loss ? 'up' : loss > gain ? 'down' : 'flat'
