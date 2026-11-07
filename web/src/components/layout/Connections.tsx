import { Fragment } from 'react'
import { useActivityStore } from '@/stores/activityStore'
import css from './Connections.module.css'

const TIPS = {
  Modèles: "Clés des fournisseurs de modèles (Claude, OpenAI, Gemini…). Une seule suffit : celle du fournisseur choisi pour le Bot IA et pour les propositions de la page Trading. À mettre dans .env, puis relancer le serveur.",
  Ollama: "Modèles locaux (gratuits, sans clé). Actif = le serveur Ollama répond ; dessous, les modèles installés, choisissables dans le Bot IA et les propositions. Installer un modèle : `ollama pull qwen3:8b`.",
  Kraken: "Clés de l'API Kraken : nécessaires seulement pour le mode LIVE (droits Query Funds + Create Orders, jamais de retrait). Le paper trading n'en a pas besoin.",
} as const

/** Groupe Ollama : serveur actif ou éteint, puis les modèles installés. */
function OllamaGroup({ ollama }: { ollama: { up: boolean; models: string[] } }) {
  return (
    <div className={css.group} data-tip={TIPS.Ollama} tabIndex={0}>
      <div className={css.name}>Ollama</div>
      <div className={css.var}>
        <span>serveur</span>
        <span className={ollama.up ? css.set : css.unset}>{ollama.up ? '● actif' : '○ éteint'}</span>
      </div>
      {ollama.models.map((m) => <div key={m} className={css.model} title={m}>{m}</div>)}
      {ollama.up && !ollama.models.length && <div className={css.model}>aucun modèle installé</div>}
    </div>
  )
}

/** Bas du menu : quelles variables d'environnement sont définies (« set ») ou non. Le serveur n'envoie jamais leurs valeurs. */
export function Connections() {
  const c = useActivityStore((s) => s.connections)
  const ollama = c && c !== 'unavailable' ? c.ollama : null
  const groups = c && c !== 'unavailable' ? ([['Modèles', c.models], ['Kraken', c.kraken]] as const) : []
  return (
    <div className={css.conn}>
      <div className={css.title}>Connexions</div>
      {c === 'unavailable' && <div className={css.note}>Serveur à redémarrer pour voir l’état des connexions.</div>}
      {groups.map(([name, vars]) => (
        <Fragment key={name}>
          <div className={css.group} data-tip={TIPS[name]} tabIndex={0}>
            <div className={css.name}>{name}</div>
            {vars.map((v) => (
              <div key={v.name} className={css.var}>
                <span>{v.name}</span>
                <span className={v.set ? css.set : css.unset}>{v.set ? '● set' : '○ non'}</span>
              </div>
            ))}
          </div>
          {name === 'Modèles' && ollama && <OllamaGroup ollama={ollama} />}
        </Fragment>
      ))}
    </div>
  )
}
