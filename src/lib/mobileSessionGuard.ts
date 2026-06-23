const APP_URL_KEY = 'dmx-app-url';

export function isExternalVideoHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.includes('youtube') || h.includes('youtu.be') || h.includes('googlevideo');
}

function rememberAppUrl(): void {
  if (typeof window === 'undefined') return;
  if (isExternalVideoHost(window.location.hostname)) return;
  sessionStorage.setItem(APP_URL_KEY, window.location.href.split('#')[0]);
}

export function lockAppUrl(): void {
  if (typeof window === 'undefined') return;
  if (isExternalVideoHost(window.location.hostname)) return;
  rememberAppUrl();
  const url = new URL(window.location.href);
  window.history.replaceState({ dmxApp: 1 }, document.title, `${url.pathname}${url.search}`);
}

function bounceFromExternalHost(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isExternalVideoHost(window.location.hostname)) return false;
  const home = sessionStorage.getItem(APP_URL_KEY) || '/';
  window.location.replace(home);
  return true;
}

export function initMobileSessionGuard(): void {
  if (typeof window === 'undefined') return;

  rememberAppUrl();

  window.addEventListener('pageshow', (event) => {
    if (bounceFromExternalHost()) return;
    rememberAppUrl();
    if ((event as PageTransitionEvent).persisted) {
      window.dispatchEvent(new CustomEvent('dmx:bfcache-restore'));
    }
  });

  window.addEventListener('popstate', () => {
    if (bounceFromExternalHost()) return;
    rememberAppUrl();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (bounceFromExternalHost()) return;
      rememberAppUrl();
    }
  });
}
