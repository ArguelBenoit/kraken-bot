import { useLayoutEffect, useState, type RefObject } from 'react'

/** Hauteur max d'un conteneur de tableau pour n'afficher que `rows` lignes (le reste défile). `undefined` = pas de limite. */
export function useMaxRowsHeight(ref: RefObject<HTMLElement | null>, rows: number, dep: unknown): number | undefined {
  const [h, setH] = useState<number>()
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const trs = Array.from(el.querySelectorAll('tbody tr'))
    const head = el.querySelector('thead')
    if (trs.length <= rows || !head) return setH(undefined)
    setH(head.getBoundingClientRect().height + trs.slice(0, rows).reduce((a, r) => a + r.getBoundingClientRect().height, 0) + 1)
  }, [ref, rows, dep])
  return h
}
