import { Route, Routes } from 'react-router-dom'
import { AiPage } from '@/pages/AiPage'
import { BotPage } from '@/pages/BotPage'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BotPage />} />
      <Route path="/ai" element={<AiPage />} />
      <Route path="*" element={<BotPage />} />
    </Routes>
  )
}
