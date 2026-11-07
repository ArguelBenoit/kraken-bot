import { useEffect, useRef } from 'react'
import { useModels } from '@/hooks/useModels'
import type { Providers } from '@/lib/types'
import { Field } from './Field'

interface Props {
  providers: Providers
  provider: string
  model: string
  /** Appelé quand le fournisseur ou le modèle change. */
  onChange: (provider: string, model: string) => void
  /** Sans libellés (bloc de propositions) ; sinon deux champs « Fournisseur » et « Modèle ». */
  compact?: boolean
}

/** Choix du fournisseur (Claude, OpenAI, Gemini…) puis du modèle dans la liste fournie par son API (exemples si la clé est absente). */
export function ModelPicker({ providers, provider, model, onChange, compact }: Props) {
  const list = useModels(provider)
  const switched = useRef(false)

  // après un changement de fournisseur : si le modèle courant n'existe pas chez lui, on prend le premier de sa liste
  useEffect(() => {
    if (!switched.current || !list) return
    switched.current = false
    if (list.models.length && !list.models.includes(model)) onChange(provider, list.models[0])
  }, [list, model, provider, onChange])

  const options = list ? (list.models.includes(model) || !model ? list.models : [model, ...list.models]) : [model]
  // seuls les fournisseurs connectés (clé définie, ou Ollama qui répond) ; le fournisseur courant reste affiché pour ne pas tromper
  const shown = Object.entries(providers).filter(([k, p]) => p.connected || k === provider)
  const select = (
    <select className={compact ? undefined : 'wide'} value={provider}
      onChange={(e) => { switched.current = true; onChange(e.target.value, providers[e.target.value]?.models[0] ?? '') }}>
      {shown.map(([k, p]) => <option key={k} value={k}>{p.label}{p.connected ? '' : ' (non connecté)'}</option>)}
    </select>
  )
  const modelSelect = (
    <select className={compact ? undefined : 'wide'} value={model} onChange={(e) => onChange(provider, e.target.value)}>
      {options.map((m) => <option key={m} value={m}>{m}</option>)}
    </select>
  )
  const none = !Object.values(providers).some((p) => p.connected)
  const note = none ? <div className="hint">Aucun fournisseur connecté : ajoute une clé dans .env (ou lance Ollama), puis relance le serveur.</div> : list?.source === 'examples' ? <div className="hint">Exemples seulement : {list.notice ?? 'liste indisponible'}</div> : null
  if (compact) return <>{select}{modelSelect}{note}</>
  return (
    <>
      <Field label="Fournisseur" tip="Qui héberge le modèle. La clé API correspondante se met dans .env (voir « Connexions » en bas du menu). Ollama = modèle local, sans clé ni coût : adresse dans OLLAMA_URL (défaut http://localhost:11434). Pense alors à décocher le plafond d'appels.">{select}</Field>
      <Field label="Modèle" tip="Liste réelle des modèles que ta clé peut utiliser, demandée au fournisseur. Sans clé, seulement quelques exemples. Un modèle plus puissant analyse mieux mais coûte plus cher par appel.">{modelSelect}</Field>
      {note}
    </>
  )
}
