import { Outlet } from 'react-router-dom'
import { usePolling } from '@/hooks/usePolling'
import { useActivityStore } from '@/stores/activityStore'
import css from './AppShell.module.css'
import { Sidebar } from './Sidebar'

/** Mise en page : barre latérale (menus) + zone de contenu (bandeau de la page puis cartes). */
export function AppShell() {
  usePolling(useActivityStore((s) => s.refresh), 4000)
  return (
    <div className={css.shell}>
      <Sidebar />
      <div className={css.content}>
        <Outlet />
      </div>
    </div>
  )
}
