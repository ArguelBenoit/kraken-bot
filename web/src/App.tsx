import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AiPage } from '@/pages/AiPage'
import { BotPage } from '@/pages/BotPage'
import { LearnPage } from '@/pages/LearnPage'
import { TradingPage } from '@/pages/TradingPage'

/** Routes de l'application : chaque page s'affiche dans la mise en page commune (barre latérale + contenu). */
export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<BotPage />} />
        <Route path="/trading" element={<TradingPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/:id" element={<LearnPage />} />
        <Route path="/learn/:id/:step" element={<LearnPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="*" element={<BotPage />} />
      </Route>
    </Routes>
  )
}
