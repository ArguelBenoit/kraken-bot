import { Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AiPage } from '@/pages/AiPage'
import { BotPage } from '@/pages/BotPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<BotPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="*" element={<BotPage />} />
      </Route>
    </Routes>
  )
}
