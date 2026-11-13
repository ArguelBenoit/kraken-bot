import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ToastHost } from '@/components/ui/ToastHost'
import { usePolling } from '@/hooks/usePolling'
import { useActivityStore } from '@/stores/activityStore'
import { useLearnStore } from '@/stores/learnStore'
import css from './AppShell.module.css'
import { Sidebar } from './Sidebar'

/** Mise en page : barre latérale (menus) + zone de contenu (bandeau de la page puis cartes). */
export function AppShell() {
  usePolling(useActivityStore((s) => s.refresh), 4000)
  usePolling(useActivityStore((s) => s.loadConnections), 60_000)
  useEffect(() => { void useLearnStore.getState().load() }, [])     // l'avancement du tutoriel s'affiche dans le menu
  return (
    <div className={css.shell}>
      <Sidebar />
      <div className={css.content}>
        <Outlet />
      </div>
      <ToastHost />
      <ConfirmDialog />
    </div>
  )
}
