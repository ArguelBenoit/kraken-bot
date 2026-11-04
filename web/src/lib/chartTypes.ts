/** Repère posé sur une bougie (signal, achat, vente). */
export interface ChartMarker {
  time: number
  position: 'aboveBar' | 'belowBar'
  color: string
  shape: 'arrowUp' | 'arrowDown' | 'circle'
  text?: string
}

/** Ligne horizontale tracée sur le graphique des prix (achat, stop, objectif, ordre limite…). */
export interface ChartLevel {
  price: number
  color: string
  title: string
}
