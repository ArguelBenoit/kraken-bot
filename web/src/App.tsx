import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AiPage } from '@/pages/AiPage'
import { LearnPage } from '@/pages/LearnPage'
import { TradingPage } from '@/pages/TradingPage'

/** Routes de l'application : chaque page s'affiche dans la mise en page commune (barre latérale + contenu). Le Trading est la page d'accueil. */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<TradingPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/:id" element={<LearnPage />} />
        <Route path="/learn/:id/:step" element={<LearnPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
