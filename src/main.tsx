import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initTheme } from './lib/theme'
import { bootstrapCoverCache } from './lib/coverBootstrap'
import { registerCoverServiceWorker } from './lib/coverServiceWorker'
import { initMobileSessionGuard } from './lib/mobileSessionGuard'
import './index.css'
import App from './App.tsx'

initTheme()
registerCoverServiceWorker()
bootstrapCoverCache()
initMobileSessionGuard()

if (typeof document !== 'undefined') {
  document.addEventListener('gesturestart', (event) => event.preventDefault(), { passive: false })
  document.addEventListener(
    'contextmenu',
    (event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          '.cinema-mobile-reels-stage, .mobile-reels-speed-zone, .cinema-mobile-cover-poster'
        )
      ) {
        event.preventDefault();
      }
    },
    { capture: true }
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
