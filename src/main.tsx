import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from './lib/theme'
import { bootstrapCoverCache } from './lib/coverBootstrap'
import './index.css'
import App from './App.tsx'

initTheme()
bootstrapCoverCache()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
