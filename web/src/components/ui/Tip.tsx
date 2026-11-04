/** Pastille « ? » avec infobulle au survol / focus clavier. */
export function Tip({ text, right = false }: { text?: string; right?: boolean }) {
  if (!text) return null
  return (
    <i className={`tip${right ? ' right' : ''}`} tabIndex={0} data-tip={text}>
      ?
    </i>
  )
}
