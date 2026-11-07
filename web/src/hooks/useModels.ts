import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

/** Liste de modèles d'un fournisseur : `api` = liste officielle (via la clé), `examples` = repli (clé absente ou API en échec, `notice` l'explique). */
export interface ModelList {
  models: string[]
  source: 'api' | 'examples'
  notice?: string
}

const cache = new Map<string, ModelList>()

/** Modèles disponibles chez `provider` (mémorisés pour la session) ; `null` pendant le chargement. */
export function useModels(provider: string): ModelList | null {
  const [fetched, setFetched] = useState<{ provider: string; list: ModelList } | null>(null)
  useEffect(() => {
    if (cache.has(provider)) return
    let live = true
    api.get<ModelList>(`/api/models/${provider}`)
      .then((list) => {
        if (list.source === 'api') cache.set(provider, list)
        if (live) setFetched({ provider, list })
      })
      .catch(() => undefined)
    return () => { live = false }
  }, [provider])
  return cache.get(provider) ?? (fetched?.provider === provider ? fetched.list : null)
}
