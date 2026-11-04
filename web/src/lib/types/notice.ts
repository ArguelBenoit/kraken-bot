/** Message de retour affiché sous un formulaire (erreur en rouge, succès en vert). */
export interface Notice {
  kind: 'error' | 'ok'
  text: string
}
