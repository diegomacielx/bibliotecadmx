import { useEffect, useState } from 'react';

/** Celular / tablet touch no browser — independente de media queries bugadas no iOS */
export function detectMobileShell(): boolean {
  if (typeof window === 'undefined') return false;
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
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      delete root.dataset.mobileShell;
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  return mobile;
}
