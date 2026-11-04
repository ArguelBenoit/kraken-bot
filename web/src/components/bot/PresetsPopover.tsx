import { ChevronDown, Circle, Pin, SlidersHorizontal, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useDismiss } from '@/hooks/useDismiss'
import { ALL_FIELDS } from '@/lib/fields'
import { BUILTIN, PRESET_NAMES, PRESETS, RISK_COLOR, summarize, type PresetConfig } from '@/lib/presets'
import type { PinnedPreset } from '@/lib/types'
import { useBotStore, type Draft } from '@/stores/botStore'
import css from './PresetsPopover.module.css'

const FORM_NAMES = new Set<string>(ALL_FIELDS.map((f) => f.name))
const formValues = (c: PresetConfig): Draft =>
  Object.fromEntries(Object.entries(c).filter(([k]) => FORM_NAMES.has(k))) as Draft

/** Presets intégrés et configs épinglées. Ne fait que pré-remplir le formulaire (rien n'est enregistré). */
export function PresetsPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pinned: PinnedPreset[] = useBotStore((s) => s.status?.state.presets) ?? []
  const { applyDraft, removePreset } = useBotStore.getState()
  const close = () => setOpen(false)
  useDismiss(ref, close, open)

  const apply = (cfg: PresetConfig, name: string) => {
    close()
    applyDraft({ strategy: 'rsi', ...formValues(cfg) }, { kind: 'ok', text: `« ${name} » chargé : vérifie puis clique Enregistrer` })
  }

  return (
    <div className={css.wrap} ref={ref}>
      <Button variant="sec" size="title" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="ic mr" />
        Presets
        <ChevronDown className="ic m0" style={{ marginLeft: 4 }} />
      </Button>
      {open && (
        <div className={css.list}>
          {BUILTIN.map(([risk, items]) => (
            <div className={css.group} key={risk}>
              <small>
                <span style={{ color: RISK_COLOR[risk] }}>
                  <Circle className="ic f dot" />
                </span>
                {risk}
              </small>
              {items.map(([id, label]) => (
                <button type="button" className="chip" key={id} title={summarize(PRESETS[id])} onClick={() => apply(PRESETS[id], PRESET_NAMES[id])}>
                  {label}
                </button>
              ))}
            </div>
          ))}

          <div className={css.group}>
            <small>
              <Pin className="ic" /> Mes configs
            </small>
            {pinned.length === 0 && <span className="t-mu small">Aucune. Règle, Enregistre, puis clique « Épingler ».</span>}
            {pinned.map((p) => (
              <span className="chipw" key={p.id}>
                <button type="button" className="chip" title={`${summarize(p.config)} — épinglée le ${p.created}`} onClick={() => apply(p.config, p.name)}>
                  {p.name}
                </button>
                <button
                  type="button"
                  className="chip x"
                  title="Supprimer cette config épinglée"
                  onClick={() => {
                    if (window.confirm(`Supprimer la config épinglée « ${p.name} » ?`)) void removePreset(p.id, p.name)
                  }}
                >
                  <X className="ic m0" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
