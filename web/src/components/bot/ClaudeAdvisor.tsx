import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { pairLabel } from '@/lib/constants'
import { summarize } from '@/lib/summary'
import { useBotStore } from '@/stores/botStore'
import css from './ClaudeAdvisor.module.css'

/**
 * Mode IA : Claude regarde le marché maintenant et propose le meilleur réglage. Le formulaire est rempli tout de suite ;
 * il ne reste qu'à « Enregistrer » puis « Démarrer ». Rien n'est enregistré ni lancé sans ce clic.
 */
export function ClaudeAdvisor() {
  const aiKey = useBotStore((s) => s.status?.ai_key)
  const pair = useBotStore((s) => s.status?.config.pair)
  const hasPosition = useBotStore((s) => !!s.status?.state.qty)
  const suggestion = useBotStore((s) => s.suggestion)
  const suggesting = useBotStore((s) => s.suggesting)
  const error = useBotStore((s) => s.suggestError)
  const { askClaude, dismissSuggestion } = useBotStore.getState()
  const [lockPair, setLockPair] = useState(false)

  const cfg = suggestion?.config
  return (
    <div className={css.box}>
      <div className={css.head}><Sparkles className="ic" />Mode IA</div>
      <div className={css.text}>
        Claude regarde le marché maintenant et propose le meilleur réglage (paire, méthode, bougie, seuils, stops). Le formulaire se remplit tout seul :
        il ne reste qu&apos;à <b>Enregistrer</b> puis <b>Démarrer</b>. Le montant des ordres n&apos;est jamais modifié.
      </div>
      <label className={css.lock}>
        <input type="checkbox" checked={lockPair} onChange={(e) => setLockPair(e.target.checked)} />
        <span>Garder ma paire actuelle ({pairLabel(pair)})</span>
      </label>
      <Button onClick={() => void askClaude(lockPair)} disabled={suggesting || aiKey === false}>
        <Sparkles className="ic mr" />
        {suggesting ? 'Claude analyse le marché…' : suggestion ? 'Redemander à Claude' : 'Demander à Claude'}
      </Button>
      {suggesting && <span className="small t-mu" style={{ marginLeft: 10 }}>10 à 30 secondes</span>}
      {aiKey === false && <div className={css.err}>ANTHROPIC_API_KEY absente : ajoute-la dans .env puis relance le serveur.</div>}
      {error && <div className={css.err}>{error}</div>}

      {suggestion && cfg && (
        <div className={css.result}>
          <div className={css.pick}>{summarize(cfg)}</div>
          {suggestion.confidence != null && (
            <div className={css.meter}>
              Confiance de Claude
              <span className={css.track}><i style={{ width: `${Math.round(suggestion.confidence * 100)}%`, display: 'block' }} /></span>
              {Math.round(suggestion.confidence * 100)} %
            </div>
          )}
          {suggestion.market_view && <div className={css.view}>Marché : {suggestion.market_view}</div>}
          <div className={css.why}>{suggestion.rationale}</div>
          {suggestion.no_edge && <div className={css.warn}>Claude ne voit pas d&apos;avantage net en ce moment : réglage prudent proposé, mais ne rien faire est une option valable.</div>}
          {hasPosition && <div className={css.hint}>Une position est ouverte : une fois enregistrée, la nouvelle méthode s&apos;appliquera à ses règles de sortie.</div>}
          <div className="small t-mu">Aucune garantie de gain : une proposition de l&apos;IA reste une hypothèse. Teste-la en paper d&apos;abord.</div>
          <div className="row">
            <Button size="xs" variant="sec" onClick={dismissSuggestion}>Masquer</Button>
          </div>
        </div>
      )}
    </div>
  )
}
