import { Play, RefreshCw, RotateCcw, Settings, Square, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { AI_TFS } from '@/lib/constants'
import { mmss } from '@/lib/format'
import type { Aggressiveness } from '@/lib/types'
import { useAiStore, type AiDraft } from '@/stores/aiStore'

type NumKey = { [K in keyof AiDraft]: AiDraft[K] extends number ? K : never }[keyof AiDraft]

const NUMBERS: { name: NumKey; label: string; step?: string; min?: number; max?: number; tip?: string }[] = [
  { name: 'max_positions', label: 'Trades en parallèle (1-5)', min: 1, max: 5, step: '1' },
]
const NUMBERS_AFTER_TF: typeof NUMBERS = [
  { name: 'interval_min', label: 'Analyse Claude toutes les (min)', step: '1' },
  { name: 'check_every', label: 'Contrôle des stops (sec)', step: '1' },
  { name: 'order_size', label: 'Montant par trade' },
  { name: 'budget', label: 'Budget alloué' },
  { name: 'max_exposure_pct', label: 'Exposition max (% budget)' },
  { name: 'max_daily_loss_pct', label: 'Perte jour max (% budget)' },
  { name: 'max_calls_per_day', label: 'Appels Claude max / jour', step: '1' },
  { name: 'fee_pct', label: 'Frais / ordre (%)' },
]
const COST: typeof NUMBERS = [
  { name: 'price_in', label: 'Prix entrée ($ / M tokens)' },
  { name: 'price_out', label: 'Prix sortie ($ / M tokens)' },
  { name: 'credit_base', label: 'Crédit restant (console, $)' },
]

function Num({ def }: { def: (typeof NUMBERS)[number] }) {
  const value = useAiStore((s) => s.draft?.[def.name])
  const setField = useAiStore((s) => s.setField)
  return (
    <Field label={def.label}>
      <input
        type="number" step={def.step ?? 'any'} min={def.min} max={def.max} value={value ?? ''}
        onChange={(e) => setField(def.name, e.target.value as never)}
      />
    </Field>
  )
}

export function AiSettingsCard() {
  const status = useAiStore((s) => s.status)
  const draft = useAiStore((s) => s.draft)
  const notice = useAiStore((s) => s.notice)
  const { setField, toggleIn, save, restore, control } = useAiStore.getState()
  if (!status || !draft) return <Card title="Réglages IA" icon={Settings}>Chargement…</Card>

  const { options, running, reviewing, key_ok, live_ok, cost, usage, next_review_s } = status
  const live = status.config.mode === 'live'
  const tokens = `tokens du jour : ${usage.in} entrée / ${usage.out} sortie`

  return (
    <Card title="Réglages IA" icon={Settings}>
      {!key_ok && <div className="warn">ANTHROPIC_API_KEY absente : ajoute-la dans .env puis relance le serveur.</div>}
      {live && (
        <div className="warn">
          Mode LIVE : Claude passe de vrais ordres au marché. Jamais testé avec de l&apos;argent réel. Aucun stop n&apos;existe chez Kraken : si ce
          programme s&apos;arrête, rien ne vend.{live_ok ? '' : ' Clés Kraken absentes.'}
        </div>
      )}
      {cost.low && (
        <div className="warn danger">
          Crédit Anthropic épuisé : le bot a été arrêté. Recharge dans la console puis ressaisis ton solde (Coût Claude) et redémarre.
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); void save() }}>
        <Field label="Modèle Claude">
          <select value={draft.model} onChange={(e) => setField('model', e.target.value)}>
            {Object.entries(options.models).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Agressivité">
          <select value={draft.aggressiveness} onChange={(e) => setField('aggressiveness', e.target.value as Aggressiveness)}>
            <option value="prudent">Prudent</option>
            <option value="equilibre">Équilibré</option>
            <option value="agressif">Agressif</option>
          </select>
        </Field>
        <div className="hint">{options.profiles[draft.aggressiveness]}</div>

        {NUMBERS.map((d) => <Num key={d.name} def={d} />)}
        <Field label="Bougie analysée">
          <select value={draft.timeframe} onChange={(e) => setField('timeframe', Number(e.target.value))}>
            {AI_TFS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {NUMBERS_AFTER_TF.map((d) => <Num key={d.name} def={d} />)}

        <details className="group">
          <summary>Coût Claude (estimation)</summary>
          {COST.map((d) => <Num key={d.name} def={d} />)}
          <div className="hint">
            Les prix dépendent du modèle : copie-les depuis la console Anthropic. Saisis ton solde actuel pour recaler l&apos;estimation
            (l&apos;API ne donne pas le solde).
          </div>
        </details>

        <details className="group" open>
          <summary>Stratégies autorisées</summary>
          {Object.entries(options.strategies).map(([k, desc]) => (
            <label className="check" key={k}>
              <input type="checkbox" checked={draft.strategies.includes(k)} onChange={() => toggleIn('strategies', k)} />
              <span><b>{k}</b><br /><small>{desc}</small></span>
            </label>
          ))}
        </details>

        <details className="group">
          <summary>Paires surveillées</summary>
          {options.pairs.map((p) => (
            <label className="check" key={p.pair}>
              <input type="checkbox" checked={draft.pairs.includes(p.pair)} onChange={() => toggleIn('pairs', p.pair)} />
              {p.label}
            </label>
          ))}
        </details>

        <label className="field block">
          Consignes libres pour Claude (optionnel)
          <textarea rows={3} maxLength={500} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Ex : évite les memecoins, privilégie BTC et ETH" />
        </label>

        <div className="row">
          <Button type="submit">Enregistrer</Button>
          <Button variant="sec" onClick={restore}><RotateCcw className="ic mr" />Restaurer</Button>
        </div>
        <Notice notice={notice} />
      </form>

      <div className="row">
        <Button disabled={running} onClick={() => void control('start')}><Play className="ic f mr" />Démarrer</Button>
        <Button variant="ko" disabled={!running} onClick={() => void control('stop')}><Square className="ic f mr" />Stop</Button>
        <Button variant="sec" disabled={reviewing} onClick={() => void control('analyze')}><RefreshCw className="ic mr" />Analyser maintenant</Button>
      </div>
      <div className="row">
        <Button variant="sec" onClick={() => window.confirm('Fermer toutes les positions au marché ?') && void control('liquidate')}>
          <LogOut className="ic mr" />Tout liquider
        </Button>
        <Button variant="sec" onClick={() => window.confirm("Réinitialiser le portefeuille et l'historique du bot IA ?") && void control('reset')}>
          Reset paper
        </Button>
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        {running && next_review_s != null ? `Prochaine analyse dans ${mmss(next_review_s)} · ${tokens}` : tokens.replace(/^t/, 'T')}
      </div>
    </Card>
  )
}
