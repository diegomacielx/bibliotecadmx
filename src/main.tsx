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

// Safari/Brave (mobile): ao voltar ao app via bfcache ou restauração de aba, a
// página pode reaparecer congelada/preta ou com um iframe do YouTube em estado
// inválido. Forçamos um reload limpo nesse caso para sempre voltar ao site.
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (event) => {
    if ((event as PageTransitionEvent).persisted) {
      window.location.reload()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
