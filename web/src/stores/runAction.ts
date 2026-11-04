import { errMsg } from '@/lib/api'
import { toast } from './uiStore'

/**
 * Exécute une action serveur pour un store : affiche le résultat en notification (succès si `successText`, sinon rien ;
 * échec avec le message d'erreur du serveur) puis recharge l'état. Renvoie true si l'action a réussi.
 */
export async function runAction(action: () => Promise<unknown>, successText: string | undefined, refresh: () => Promise<void>): Promise<boolean> {
  try {
    await action()
    if (successText) toast.ok(successText)
    return true
  } catch (e) {
    toast.error(errMsg(e))
    return false
  } finally {
    await refresh()
  }
}
