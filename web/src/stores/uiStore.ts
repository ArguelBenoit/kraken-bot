import { create } from 'zustand'

export type ToastKind = 'ok' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  text: string
}

/** Contenu d'une boîte de confirmation. `lines` = récapitulatif en deux colonnes (ex. paire, montant, stops d'un ordre). */
export interface ConfirmOptions {
  title: string
  message?: string
  lines?: [label: string, value: string][]
  confirmLabel?: string
  cancelLabel?: string
  /** Action sensible ou irréversible : bouton rouge, et le focus est mis sur « Annuler ». */
  danger?: boolean
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (accepted: boolean) => void
}

interface UiStore {
  toasts: Toast[]
  dialog: PendingConfirm | null
  push: (kind: ToastKind, text: string) => void
  dismiss: (id: number) => void
  ask: (options: ConfirmOptions) => Promise<boolean>
  answer: (accepted: boolean) => void
}

const MAX_TOASTS = 5
let nextId = 1

/** Messages éphémères (toasts) et boîte de confirmation unique, affichés par `ToastHost` et `ConfirmDialog`. */
export const useUiStore = create<UiStore>((set, get) => ({
  toasts: [],
  dialog: null,

  push: (kind, text) => set((s) => ({ toasts: [...s.toasts, { id: nextId++, kind, text }].slice(-MAX_TOASTS) })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  ask: (options) =>
    new Promise<boolean>((resolve) => {
      get().dialog?.resolve(false) // une seule boîte à la fois : la précédente est refusée
      set({ dialog: { ...options, resolve } })
    }),

  answer: (accepted) => {
    const d = get().dialog
    set({ dialog: null })
    d?.resolve(accepted)
  },
}))

/** Notifications : `toast.ok('Ordre exécuté')`, `toast.error(message)`, `toast.info(message)`. Utilisable hors composants (stores). */
export const toast = {
  ok: (text: string) => useUiStore.getState().push('ok', text),
  error: (text: string) => useUiStore.getState().push('error', text),
  info: (text: string) => useUiStore.getState().push('info', text),
}

/** Demande une validation à l'utilisateur ; résout true s'il confirme, false s'il annule (bouton, Échap ou clic à côté). */
export const confirmAction = (options: ConfirmOptions) => useUiStore.getState().ask(options)
