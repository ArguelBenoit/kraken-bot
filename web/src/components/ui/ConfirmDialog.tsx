import { ShieldAlert, TriangleAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { Button } from './Button'
import css from './ConfirmDialog.module.css'

/**
 * Boîte de confirmation modale (remplace `window.confirm`) : titre, message, récapitulatif facultatif, « Annuler » / « Confirmer ».
 * Échap ou un clic à côté annule. Pour une action sensible (`danger`), le focus est sur « Annuler » : un Entrée distrait ne valide rien.
 */
export function ConfirmDialog() {
  const dialog = useUiStore((s) => s.dialog)
  const answer = useUiStore((s) => s.answer)
  const focus = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!dialog) return
    focus.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && answer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialog, answer])

  if (!dialog) return null
  const Icon = dialog.danger ? ShieldAlert : TriangleAlert
  const confirm = (
    <Button key="ok" variant={dialog.danger ? 'ko' : 'primary'} ref={dialog.danger ? undefined : focus} onClick={() => answer(true)}>
      {dialog.confirmLabel ?? 'Confirmer'}
    </Button>
  )
  return (
    <div className={css.backdrop} onMouseDown={(e) => e.target === e.currentTarget && answer(false)}>
      <div className={`${css.dialog} ${dialog.danger ? css.danger : ''}`} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
        <h2 className={css.title} id="dlg-title"><Icon className="ic" />{dialog.title}</h2>
        {dialog.message && <p className={css.message}>{dialog.message}</p>}
        {dialog.lines && (
          <dl className={css.lines}>
            {dialog.lines.map(([label, value]) => (
              <div key={label} style={{ display: 'contents' }}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        )}
        <div className={css.actions}>
          <Button variant="sec" ref={dialog.danger ? focus : undefined} onClick={() => answer(false)}>{dialog.cancelLabel ?? 'Annuler'}</Button>
          {confirm}
        </div>
      </div>
    </div>
  )
}
