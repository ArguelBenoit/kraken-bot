import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useEffect } from 'react'
import { useUiStore, type Toast, type ToastKind } from '@/stores/uiStore'
import css from './ToastHost.module.css'

/** Durée d'affichage : les erreurs restent plus longtemps pour laisser le temps de les lire. */
const DURATION_MS: Record<ToastKind, number> = { ok: 5000, info: 6000, error: 10000 }
const ICONS = { ok: CircleCheck, error: CircleAlert, info: Info }

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useUiStore((s) => s.dismiss)
  const Icon = ICONS[t.kind]
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(t.id), DURATION_MS[t.kind])
    return () => window.clearTimeout(timer)
  }, [t.id, t.kind, dismiss])
  return (
    <div className={`${css.toast} ${css[t.kind]}`} role={t.kind === 'error' ? 'alert' : 'status'} onClick={() => dismiss(t.id)}>
      <Icon className={css.icon} />
      <span className={css.text}>{t.text}</span>
      <X className={css.close} aria-label="Fermer" />
    </div>
  )
}

/** Pile de notifications en bas à droite : succès (vert), erreur (rouge), information (orange). Un clic ferme un message. */
export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  return (
    <div className={css.host} aria-live="polite">
      {toasts.map((t) => <ToastItem key={t.id} t={t} />)}
    </div>
  )
}
