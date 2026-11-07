import { RotateCcw, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { ModelPicker } from '@/components/ui/ModelPicker'
import { Tip } from '@/components/ui/Tip'
import { AI_TFS } from '@/lib/constants'
import { CALLS_FIELD, LIMIT_FIELDS, PARALLEL_FIELD, type NumberField } from '@/lib/aiForm'
import type { Aggressiveness } from '@/lib/types'
import { useAiStore } from '@/stores/aiStore'
import { AiControls } from './AiControls'
import { AiWarnings } from './AiWarnings'

/** Champ numérique lié au brouillon du formulaire. */
function NumberInput({ def }: { def: NumberField }) {
  const value = useAiStore((s) => s.draft?.[def.name])
  const setField = useAiStore((s) => s.setField)
  return (
    <Field label={def.label} tip={def.tip}>
      <input type="number" step={def.step ?? 'any'} min={def.min} max={def.max} value={value ?? ''} onChange={(e) => setField(def.name, e.target.value)} />
    </Field>
  )
}

/** Réglages du Bot IA : modèle, agressivité, limites, stratégies et paires autorisées ; contrôles du bot en dessous. */
export function AiSettingsCard() {
  const status = useAiStore((s) => s.status)
  const draft = useAiStore((s) => s.draft)
  const { setField, toggleIn, save, restore } = useAiStore.getState()
  if (!status || !draft) return <Card title="Réglages IA" icon={Settings}>Chargement…</Card>

  const { options, key_ok, live_ok, credit_low } = status
  const provider = options.providers[draft.provider]

  return (
    <Card title="Réglages IA" icon={Settings}>
      <AiWarnings keyOk={key_ok} keyEnv={provider?.env ?? ''} live={status.config.mode === 'live'} liveOk={live_ok} creditLow={credit_low} />

      <form onSubmit={(e) => { e.preventDefault(); void save() }}>
        <ModelPicker providers={options.providers} provider={draft.provider} model={draft.model}
          onChange={(p, m) => { setField('provider', p); setField('model', m) }} />
        <Field label="Agressivité" tip="Le code impose selon ce profil : la confiance minimale du modèle pour ouvrir, la taille maximale d'une position et le stop loss maximal. Prudent = rare et petit, agressif = plus d'ordres et plus gros.">
          <select value={draft.aggressiveness} onChange={(e) => setField('aggressiveness', e.target.value as Aggressiveness)}>
            <option value="prudent">Prudent</option>
            <option value="equilibre">Équilibré</option>
            <option value="agressif">Agressif</option>
          </select>
        </Field>
        <div className="hint">{options.profiles[draft.aggressiveness]}</div>

        <NumberInput def={PARALLEL_FIELD} />
        <Field label="Bougie analysée" tip="Durée des bougies que le modèle voit (15 min à 1 jour). Plus court = plus de bruit et plus d'ordres ; plus long = moins de signaux. Nos tests donnent de meilleurs résultats en 4 h.">
          <select value={draft.timeframe} onChange={(e) => setField('timeframe', e.target.value)}>
            {AI_TFS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {LIMIT_FIELDS.map((d) => <NumberInput key={d.name} def={d} />)}

        <label className="check">
          <input type="checkbox" checked={draft.limit_calls} onChange={(e) => setField('limit_calls', e.target.checked)} />
          <span>Limiter les appels par jour<Tip text="Décoché : aucun plafond, utile avec un modèle qui tourne en local (gratuit). Le compteur d'appels du jour continue de s'afficher." /></span>
        </label>
        {draft.limit_calls && <NumberInput def={CALLS_FIELD} />}

        <Accordion id="ai-strategies" title={<>Stratégies autorisées<Tip text="Les approches que le modèle a le droit d'utiliser pour ouvrir un trade. Décoche celles que tu ne veux pas ; il en faut au moins une." /></>}>
          {Object.entries(options.strategies).map(([k, desc]) => (
            <label className="check" key={k}>
              <input type="checkbox" checked={draft.strategies.includes(k)} onChange={() => toggleIn('strategies', k)} />
              <span><b>{k}</b><br /><small>{desc}</small></span>
            </label>
          ))}
        </Accordion>

        <Accordion id="ai-pairs" title={<>Paires surveillées<Tip text="Les cryptos que le modèle peut analyser et trader. Moins de paires = moins de tokens par analyse." /></>}>
          {options.pairs.map((p) => (
            <label className="check" key={p.pair}>
              <input type="checkbox" checked={draft.pairs.includes(p.pair)} onChange={() => toggleIn('pairs', p.pair)} />
              {p.label}
            </label>
          ))}
        </Accordion>

        <label className="field block">
          <span>Consignes libres pour le modèle (optionnel)<Tip text="Texte ajouté au prompt du modèle (500 caractères max). Il ne peut pas lever les garde-fous du code : stop loss obligatoire, exposition, perte journalière…" /></span>
          <textarea rows={3} maxLength={500} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Ex : évite les memecoins, privilégie BTC et ETH" />
        </label>

        <div className="row">
          <Button type="submit">Enregistrer</Button>
          <Button variant="sec" onClick={restore}><RotateCcw className="ic mr" />Restaurer</Button>
        </div>
      </form>

      <AiControls status={status} />
    </Card>
  )
}
