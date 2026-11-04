import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { useManualStore } from '@/stores/manualStore'

const FIELDS = [
  { k: 'max_order', label: 'Montant max par ordre', tip: 'Garde-fou : un ordre plus gros est refusé (évite une faute de frappe, surtout en live).' },
  { k: 'fee_pct', label: 'Frais %', tip: 'Frais Kraken estimés par ordre (0,26 % en taker). Sert au calcul du PnL.' },
  { k: 'check_every', label: 'Contrôle des stops (s)', tip: 'Fréquence à laquelle les stops, objectifs et ordres limites sont vérifiés. Entre deux contrôles, un prix peut passer le seuil.' },
  { k: 'paper_balance', label: 'Capital paper', tip: 'Capital fictif de départ en mode Paper. Pris en compte au « Reset paper ».' },
] as const

/** Réglages du trading manuel : montant maximum par ordre, frais, fréquence de contrôle des stops, capital paper. */
export function ManualSettingsCard() {
  const status = useManualStore((s) => s.status)
  const notice = useManualStore((s) => s.notice)
  const { saveConfig, reset } = useManualStore.getState()
  const [v, setV] = useState<Record<string, string>>({})
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (status && !filled) {
      setV(Object.fromEntries(FIELDS.map((f) => [f.k, String(status.config[f.k])])))
      setFilled(true)
    }
  }, [status, filled])

  const paper = status?.config.mode === 'paper'
  const onReset = () => {
    if (window.confirm('Réinitialiser le portefeuille paper du trading manuel ?\n\nPositions, ordres en attente, historique et PnL seront effacés. Irréversible.')) void reset()
  }

  return (
    <Card title="Réglages" icon={Settings}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void saveConfig(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])))
        }}
      >
        {FIELDS.filter((f) => f.k !== 'paper_balance' || paper).map((f) => (
          <Field key={f.k} label={f.label} tip={f.tip}>
            <input type="number" step="any" value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />
          </Field>
        ))}
        <div className="row">
          <Button type="submit">Enregistrer</Button>
          {paper && <Button variant="sec" onClick={onReset}>Reset paper</Button>}
        </div>
        <Notice notice={notice} collapse />
      </form>
    </Card>
  )
}
