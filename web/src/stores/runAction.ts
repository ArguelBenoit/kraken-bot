import { errMsg } from '@/lib/api'
import type { Notice } from '@/lib/types'

/**
 * Exécute une action serveur pour un store : affiche le résultat (succès ou message d'erreur du serveur) et recharge l'état.
 * Renvoie true si l'action a réussi.
 */
export async function runAction(
  action: () => Promise<unknown>,
  successText: string | undefined,
  setNotice: (notice: Notice | null) => void,
  refresh: () => Promise<void>,
): Promise<boolean> {
  try {
    await action()
    setNotice(successText ? { kind: 'ok', text: successText } : null)
    return true
  } catch (e) {
    setNotice({ kind: 'error', text: errMsg(e) })
    return false
  } finally {
    await refresh()
  }
}
