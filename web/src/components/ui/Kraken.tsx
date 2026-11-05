import type { SVGProps } from 'react'

/** Icône pieuvre (le kraken), dessinée comme les icônes lucide : trait `currentColor`, utilisable avec la classe `ic`. */
export function Kraken(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 13C6 7 8.5 3 12 3s6 4 6 10" />
      <path d="M6 13c0 3-1.2 5-3.5 6M9.5 14c0 2.5-.5 4.5-2 6M14.5 14c0 2.5.5 4.5 2 6M18 13c0 3 1.2 5 3.5 6M6 13h12" />
      <circle cx="9.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="9.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
