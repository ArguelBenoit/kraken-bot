interface Props {
  notice: { kind: 'error' | 'ok'; text: string } | null
  /** Ne rien afficher (et ne pas réserver de place) quand il n'y a pas de message. Par défaut la hauteur est réservée pour éviter les sauts de mise en page. */
  collapse?: boolean
}

/** Message de retour (erreur en rouge, succès en vert). */
export function Notice({ notice, collapse = false }: Props) {
  if (collapse && !notice?.text) return null
  return <div className={`notice ${notice?.kind ?? ''}`}>{notice?.text}</div>
}
