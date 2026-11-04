import { useEffect, useRef } from 'react'

/** Appelle `fn` toutes les `ms` millisecondes (et une fois au montage si `immediate`). Toujours la dernière version de `fn`. */
export function usePolling(fn: () => unknown, ms: number, immediate = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (immediate) void ref.current()
    const id = setInterval(() => void ref.current(), ms)
    return () => clearInterval(id)
  }, [ms, immediate])
}
