import { useEffect, useState } from 'react';

const FORCE_MOBILE_KEY = 'dmx_force_mobile_shell';

declare global {
  interface Window {
    DMX_FORCE_MOBILE_SHELL?: (enabled: boolean) => void;
  }
}

function readForcedMobileFlag(): boolean | null {
  if (typeof window === 'undefined') return null;

  const fromUrl = new URLSearchParams(window.location.search).get('mobile');
  if (fromUrl === '1' || fromUrl === 'true') return true;
  if (fromUrl === '0' || fromUrl === 'false') return false;

  try {
    const raw = localStorage.getItem(FORCE_MOBILE_KEY);
    if (raw === '1' || raw === 'true') return true;
    if (raw === '0' || raw === 'false') return false;
  } catch {
    /* ignore */
  }

  return null;
}

/** Celular / tablet touch no browser — independente de media queries bugadas no iOS */
export function detectMobileShell(): boolean {
  if (typeof window === 'undefined') return false;
  const forced = readForcedMobileFlag();
  if (forced != null) return forced;

  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msMaxTouchPoints > 0;
  const narrow = window.innerWidth <= 1024;
  return hasTouch || narrow;
}

export function useMobileShell(): boolean {
  const [mobile, setMobile] = useState(() => detectMobileShell());

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const next = detectMobileShell();
      setMobile(next);
      if (next) root.dataset.mobileShell = 'true';
      else delete root.dataset.mobileShell;
    };
    sync();
    window.DMX_FORCE_MOBILE_SHELL = (enabled: boolean) => {
      try {
        localStorage.setItem(FORCE_MOBILE_KEY, enabled ? '1' : '0');
      } catch {
        /* ignore */
      }
      sync();
      window.location.reload();
    };
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      delete root.dataset.mobileShell;
      delete window.DMX_FORCE_MOBILE_SHELL;
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  return mobile;
}
