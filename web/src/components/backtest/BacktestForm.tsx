import { FlaskConical, Pause, Play, Square } from 'lucide-react'
import { Accordion } from '@/components/ui/Accordion'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { ModelPicker } from '@/components/ui/ModelPicker'
import { NumberInput } from '@/components/ui/NumberInput'
import { Tip } from '@/components/ui/Tip'
import { PARALLEL_FIELD, SHORT_FIELD } from '@/lib/aiForm'
import { BT_LIMIT_FIELDS, estimateCalls, type BtNumericKey } from '@/lib/backtest'
import { AI_TFS } from '@/lib/constants'
import type { Aggressiveness } from '@/lib/types'
import { useBacktestStore } from '@/stores/backtestStore'

/** Réglages d'un essai : les mêmes que ceux du Bot IA (préremplis avec ses réglages enregistrés, sans les modifier), plus la durée et un plafond d'appels. */
export function BacktestForm({ busy, paused }: { busy: boolean; paused: boolean }) {
  const status = useBacktestStore((s) => s.status)
  const draft = useBacktestStore((s) => s.draft)
  const { setField, toggleIn, start, cancel, pause, resume } = useBacktestStore.getState()
  if (!status || !draft) return <Card title="Paramètres" icon={FlaskConical}>Chargement…</Card>

  const { options } = status
  const tf = Number(draft.timeframe)
  const maxDays = options.max_days[draft.timeframe] ?? 0
  const calls = estimateCalls(Number(draft.days), tf, Number(draft.interval_min))
  const tooLong = Number(draft.days) > maxDays
  const number = (def: { name: string }) => draft[def.name as BtNumericKey]

  return (
    <Card title="Paramètres" icon={FlaskConical}>
      <form onSubmit={(e) => { e.preventDefault(); void start() }}>
        <ModelPicker providers={options.providers} provider={draft.provider} model={draft.model}
          onChange={(p, m) => { setField('provider', p); setField('model', m) }} />
        <Field label="Agressivité" tip="Le code impose selon ce profil : la confiance minimale du modèle pour ouvrir, la taille maximale d'une position et le stop loss maximal. Prudent = rare et petit, agressif = plus d'ordres et plus gros.">
          <select value={draft.aggressiveness} onChange={(e) => setField('aggressiveness', e.target.value as Aggressiveness)}>
            <option value="prudent">Prudent</option>
            <option value="equilibre">Équilibré</option>
            <option value="agressif">Agressif</option>
          </select>
        </Field>
        <NumberInput def={PARALLEL_FIELD} value={number(PARALLEL_FIELD)} onChange={(v) => setField('max_positions', v)} />
        <Field label="Bougie analysée" tip="Durée des bougies que le modèle voit. Elle fixe aussi la durée maximale testable : Kraken ne fournit que les 720 dernières bougies (60 d'entre elles servent d'échauffement aux indicateurs).">
          <select value={draft.timeframe} onChange={(e) => setField('timeframe', e.target.value)}>
            {AI_TFS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label={`Durée (jours, max ${maxDays})`} tip="Période rejouée, en finissant à aujourd'hui. Plus c'est long, plus il y a d'appels au modèle (et de trades pour juger).">
          <input type="number" min={1} max={maxDays} step="1" value={draft.days} onChange={(e) => setField('days', e.target.value)} />
        </Field>
        {BT_LIMIT_FIELDS.map((d) => <NumberInput key={d.name} def={d} value={number(d)} onChange={(v) => setField(d.name as BtNumericKey, v)} />)}
        <Field label="Appels max (sécurité)" tip="Le test s'arrête (en gardant ce qui est calculé) après ce nombre d'appels au modèle. Vide = aucune limite.">
          <input type="number" min={1} step="1" placeholder="aucune" value={draft.max_calls} onChange={(e) => setField('max_calls', e.target.value)} />
        </Field>

        <label className="check">
          <input type="checkbox" checked={draft.allow_short} onChange={(e) => setField('allow_short', e.target.checked)} />
          <span>
            <b>Autoriser les shorts</b>
            <Tip text="En plus des achats (qui restent possibles), le modèle peut parier sur la baisse (vente à découvert en marge, avec levier). Décochée, il ne fait que des achats." />
          </span>
        </label>
        {draft.allow_short && <NumberInput def={SHORT_FIELD} value={number(SHORT_FIELD)} onChange={(v) => setField('max_leverage', v)} />}

        <Accordion id="bt-strategies" title={<>Stratégies autorisées<Tip text="Les approches que le modèle a le droit d'utiliser pour ouvrir un trade. Il en faut au moins une." /></>}>
          {Object.entries(options.strategies).map(([k, desc]) => (
            <label className="check" key={k}>
              <input type="checkbox" checked={draft.strategies.includes(k)} onChange={() => toggleIn('strategies', k)} />
              <span><b>{k}</b><br /><small>{desc}</small></span>
            </label>
          ))}
        </Accordion>
        <Accordion id="bt-pairs" title={<>Paires surveillées<Tip text="Les cryptos rejouées. Plus il y en a, plus chaque appel est long (et le téléchargement des bougies)." /></>}>
          {options.pairs.map((p) => (
            <label className="check" key={p.pair}>
              <input type="checkbox" checked={draft.pairs.includes(p.pair)} onChange={() => toggleIn('pairs', p.pair)} />
              {p.label}
            </label>
          ))}
        </Accordion>

        <label className="field block">
          <span>Consignes libres pour le modèle (optionnel)<Tip text="Texte ajouté au prompt du modèle (500 caractères max), comme dans les réglages du Bot IA." /></span>
          <textarea rows={3} maxLength={500} value={draft.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Ex : évite les memecoins, privilégie BTC et ETH" />
        </label>

        <div className="hint">
          {tooLong ? `Durée trop longue pour des bougies de ${tf} min (max ${maxDays} jours).` : `≈ ${calls} analyses, donc ≈ ${calls} appels au modèle.`}
          {' '}Valeurs de départ = réglages enregistrés du Bot IA, qui ne sont jamais modifiés. Aucun ordre réel.
        </div>
        <div className="row">
          {busy
            ? <>
              {paused
                ? <Button variant="sec" onClick={() => void resume()}><Play className="ic f mr" />Reprendre</Button>
                : <Button variant="sec" onClick={() => void pause()}><Pause className="ic f mr" />Pause</Button>}
              <Button variant="ko" onClick={() => void cancel()}><Square className="ic f mr" />Annuler</Button>
            </>
            : <Button type="submit" disabled={tooLong || draft.pairs.length === 0 || draft.strategies.length === 0 || calls === 0}><Play className="ic f mr" />Lancer le backtest</Button>}
        </div>
      </form>
    </Card>
  )
}
