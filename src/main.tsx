import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from './lib/theme'
import { bootstrapCoverCache } from './lib/coverBootstrap'
import { registerCoverServiceWorker } from './lib/coverServiceWorker'
import './index.css'
import App from './App.tsx'

initTheme()
registerCoverServiceWorker()
bootstrapCoverCache()

if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
