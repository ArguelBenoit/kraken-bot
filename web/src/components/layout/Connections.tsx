import { useActivityStore } from '@/stores/activityStore'
import css from './Connections.module.css'

const TIPS = {
  Modèles: "Clés des fournisseurs de modèles (Claude, OpenAI, Gemini…). Une seule suffit : celle du fournisseur choisi pour le Bot IA et pour les propositions de la page Trading. À mettre dans .env, puis relancer le serveur.",
  Kraken: "Clés de l'API Kraken : nécessaires seulement pour le mode LIVE (droits Query Funds + Create Orders, jamais de retrait). Le paper trading n'en a pas besoin.",
} as const

/** Bas du menu : quelles variables d'environnement sont définies (« set ») ou non. Le serveur n'envoie jamais leurs valeurs. */
export function Connections() {
  const c = useActivityStore((s) => s.connections)
  const groups = c && c !== 'unavailable' ? ([['Modèles', c.models], ['Kraken', c.kraken]] as const) : []
  return (
    <div className={css.conn}>
      <div className={css.title}>Connexions</div>
      {c === 'unavailable' && <div className={css.note}>Serveur à redémarrer pour voir l’état des connexions.</div>}
      {groups.map(([name, vars]) => (
        <div key={name} className={css.group} data-tip={TIPS[name]} tabIndex={0}>
          <div className={css.name}>{name}</div>
          {vars.map((v) => (
            <div key={v.name} className={css.var}>
              <span>{v.name}</span>
              <span className={v.set ? css.set : css.unset}>{v.set ? '● set' : '○ non'}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
