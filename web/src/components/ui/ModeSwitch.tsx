import type { Mode } from '@/lib/types'
import { confirmAction } from '@/stores/uiStore'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

/** Interrupteur PAPER / LIVE. Le passage vers LIVE demande toujours une confirmation. */
export function ModeSwitch({ mode, onChange }: Props) {
  const live = mode === 'live'
  const toggle = async () => {
    const to: Mode = live ? 'paper' : 'live'
    if (to === 'live') {
      const ok = await confirmAction({
        title: 'Passer en mode LIVE ?', danger: true, confirmLabel: 'Passer en LIVE',
        message: "Des ordres réels seront passés sur Kraken avec ton argent. Le mode live n'a jamais été testé avec de l'argent réel : commence par une très petite somme.",
      })
      if (!ok) return
    }
    onChange(to)
  }
  return (
    <button type="button" className="sw" role="switch" aria-checked={live} onClick={() => void toggle()}>
      <span className="lp">PAPER</span>
      <span className="t" />
      <span className="ll">LIVE</span>
    </button>
  )
}
