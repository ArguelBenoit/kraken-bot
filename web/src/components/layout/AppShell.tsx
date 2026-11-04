import { Outlet } from 'react-router-dom'
import css from './AppShell.module.css'
import { Sidebar } from './Sidebar'

/** Mise en page : barre latérale (menus) + zone de contenu (bandeau de la page puis cartes). */
export function AppShell() {
  return (
    <div className={css.shell}>
      <Sidebar />
      <div className={css.content}>
        <Outlet />
      </div>
    </div>
  )
}
