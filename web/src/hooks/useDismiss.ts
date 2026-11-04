import { useEffect, type RefObject } from 'react'

/** Ferme un popover au clic à l'extérieur ou sur Échap. */
export function useDismiss(ref: RefObject<HTMLElement | null>, onDismiss: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onDismiss()
    document.addEventListener('click', click)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('click', click)
      document.removeEventListener('keydown', key)
    }
  }, [ref, onDismiss, active])
}
