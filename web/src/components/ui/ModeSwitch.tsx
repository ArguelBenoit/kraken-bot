import type { Mode } from '@/lib/types'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

const CONFIRM_LIVE = 'Passer en mode LIVE : des ordres réels seront passés sur Kraken avec ton argent. Confirmer ?'

/** Interrupteur PAPER / LIVE. Le passage vers LIVE demande toujours une confirmation. */
export function ModeSwitch({ mode, onChange }: Props) {
  const live = mode === 'live'
  const toggle = () => {
    const to: Mode = live ? 'paper' : 'live'
    if (to === 'live' && !window.confirm(CONFIRM_LIVE)) return
    onChange(to)
  }
  return (
    <button type="button" className="sw" role="switch" aria-checked={live} onClick={toggle}>
      <span className="lp">PAPER</span>
      <span className="t" />
      <span className="ll">LIVE</span>
    </button>
  )
}
