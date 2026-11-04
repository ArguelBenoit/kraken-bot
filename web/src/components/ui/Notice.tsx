interface Props {
  notice: { kind: 'error' | 'ok'; text: string } | null
}

/** Message de retour (erreur en rouge, succès en vert). Réserve sa hauteur pour éviter les sauts de mise en page. */
export function Notice({ notice }: Props) {
  return <div className={`notice ${notice?.kind ?? ''}`}>{notice?.text}</div>
}
