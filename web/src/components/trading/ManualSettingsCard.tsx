import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { Tip } from '@/components/ui/Tip'
import { useManualStore } from '@/stores/manualStore'

const FIELDS = [
  { k: 'max_order', label: 'Montant max par ordre', tip: 'Garde-fou : un ordre plus gros est refusé (évite une faute de frappe, surtout en live).' },
  { k: 'fee_pct', label: 'Frais %', tip: 'Frais Kraken estimés par ordre (0,26 % en taker). Sert au calcul du PnL.' },
  { k: 'check_every', label: 'Contrôle des stops (s)', tip: 'Fréquence à laquelle les stops (en paper), objectifs, stops suiveurs et ordres limites sont vérifiés par ce programme. En live, le stop loss posé chez Kraken n’en dépend pas.' },
  { k: 'max_leverage', label: 'Levier max (short)', tip: 'Levier maximum accepté pour un short (2 à 5). Plus il est élevé, plus la liquidation est proche : à ×3, un short est liquidé vers +27 % ; à ×5, vers +16 %.' },
  { k: 'margin_fee_pct', label: 'Frais de marge %', tip: "Frais d'ouverture d'une position en marge (short), estimation (0,02 % chez Kraken). Vérifie la grille de frais de ton compte." },
  { k: 'rollover_pct', label: 'Report / 4 h %', tip: "Frais de report d'un short, facturés toutes les 4 h tant qu'il reste ouvert, estimation (0,02 %). Un short gardé plusieurs jours coûte cher." },
  { k: 'paper_balance', label: 'Capital paper', tip: 'Capital fictif de départ en mode Paper. Pris en compte au « Reset paper ».' },
] as const

/** Réglages du trading manuel : montant maximum par ordre, frais, fréquence de contrôle des stops, capital paper. */
export function ManualSettingsCard() {
  const status = useManualStore((s) => s.status)
  const notice = useManualStore((s) => s.notice)
  const { saveConfig, reset } = useManualStore.getState()
  const [v, setV] = useState<Record<string, string>>({})
  const [liveShort, setLiveShort] = useState(false)
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (status && !filled) {
      setV(Object.fromEntries(FIELDS.map((f) => [f.k, String(status.config[f.k])])))
      setLiveShort(status.config.allow_live_short)
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
          void saveConfig({ ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)])), allow_live_short: liveShort })
        }}
      >
        {FIELDS.filter((f) => f.k !== 'paper_balance' || paper).map((f) => (
          <Field key={f.k} label={f.label} tip={f.tip}>
            <input type="number" step="any" value={v[f.k] ?? ''} onChange={(e) => setV({ ...v, [f.k]: e.target.value })} />
          </Field>
        ))}
        <label className="check">
          <input type="checkbox" checked={liveShort} onChange={(e) => setLiveShort(e.target.checked)} />
          <span>
            Autoriser les shorts en LIVE
            <Tip text="Les shorts sont toujours possibles en paper. En live ils utilisent la marge Kraken (levier), jamais validée sur ton compte : à n'activer qu'après avoir testé avec validate=true (voir la doc) et avec une petite somme." />
            <br /><small>Marge Kraken jamais validée : à tes risques.</small>
          </span>
        </label>
        <div className="row">
          <Button type="submit">Enregistrer</Button>
          {paper && <Button variant="sec" onClick={onReset}>Reset paper</Button>}
        </div>
        <Notice notice={notice} collapse />
      </form>
    </Card>
  )
}
