import { Pin, Play, RotateCcw, Settings, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Fields } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { pairLabel } from '@/lib/constants'
import { FORM_ROWS, isVisible, type FieldDef } from '@/lib/fields'
import { FIELD_TIPS } from '@/lib/tips'
import type { Strategy } from '@/lib/types'
import { useBotStore } from '@/stores/botStore'
import { useMarketStore } from '@/stores/marketStore'
import { PresetsPopover } from './PresetsPopover'

function Control({ def }: { def: FieldDef }) {
  const value = useBotStore((s) => s.draft[def.name] ?? '')
  const setField = useBotStore((s) => s.setField)
  return (
    <Field label={def.label} tip={FIELD_TIPS[def.name]}>
      {def.kind === 'select' ? (
        <select value={String(value)} onChange={(e) => setField(def.name, e.target.value)}>
          {def.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input type="number" step={def.step} value={value} onChange={(e) => setField(def.name, e.target.value)} />
      )}
    </Field>
  )
}

export function SettingsCard() {
  const status = useBotStore((s) => s.status)
  const strategy = useBotStore((s) => String(s.draft.strategy ?? 'rsi')) as Strategy
  const notice = useBotStore((s) => s.notice)
  const { save, restore, control, pin } = useBotStore.getState()
  const followConfig = useMarketStore((s) => s.followConfig)
  if (!status) return <Card title="Réglages" icon={Settings}>Chargement…</Card>

  const { config, running } = status
  const saved = config

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await save()) followConfig(Number(useBotStore.getState().draft.timeframe))
  }

  const onPin = async () => {
    const def = `${pairLabel(saved.pair)} ${saved.timeframe}m RSI${saved.rsi_period} ${saved.rsi_buy}/${saved.rsi_sell} TP${saved.take_profit_pct} SL${saved.stop_loss_pct}`
    const name = window.prompt('Nom de la config à épingler (configuration actuellement enregistrée) :', def)
    if (name) await pin(name)
  }

  const onReset = () => {
    const ok = window.confirm(
      "Réinitialiser le portefeuille paper ?\n\nLa position ouverte, l'historique des trades et le PnL seront effacés, et le solde reviendra au capital de départ. Le bot sera arrêté s'il tourne. Cette action est irréversible.",
    )
    if (ok) void control('reset')
  }

  return (
    <Card title="Réglages" icon={Settings} actions={<PresetsPopover />}>
      <form onSubmit={onSubmit}>
        {FORM_ROWS.map((row, i) => {
          const visible = row.filter((f) => isVisible(f, strategy, config.mode))
          if (!visible.length) return null
          const controls = visible.map((f) => <Control key={f.name} def={f} />)
          return row.length > 1 ? <Fields key={i}>{controls}</Fields> : <div key={i}>{controls}</div>
        })}
        <div className="row">
          <Button type="submit">Enregistrer</Button>
          <Button variant="sec" title="Annule les modifications non enregistrées : remet le formulaire comme la configuration enregistrée" onClick={() => void restore()}>
            <RotateCcw className="ic mr" />
            Restaurer
          </Button>
          <Button variant="sec" title="Épingle la configuration actuellement ENREGISTRÉE (pas les modifications non enregistrées)" onClick={onPin}>
            <Pin className="ic mr" />
            Épingler
          </Button>
        </div>
        <Notice notice={notice} />
      </form>
      <div className="row">
        {!running && (
          <Button onClick={() => void control('start')}>
            <Play className="ic f mr" />
            Démarrer
          </Button>
        )}
        {running && (
          <Button variant="ko" onClick={() => void control('stop')}>
            <Square className="ic f mr" />
            Stop
          </Button>
        )}
        {config.mode === 'paper' && (
          <Button variant="sec" onClick={onReset}>
            Reset paper
          </Button>
        )}
      </div>
    </Card>
  )
}
