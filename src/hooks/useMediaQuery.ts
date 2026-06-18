import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** Detecta hardware touch — funciona no Safari/Brave mobile mesmo quando media queries falham */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).msMaxTouchPoints > 0
  );
}

const TOUCH_LAYOUT_MQ =
  '(max-width: 1024px), (hover: none), (pointer: coarse), (any-hover: none)';

function readTouchLayout(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia(TOUCH_LAYOUT_MQ).matches) return true;
  return isTouchDevice() && window.innerWidth <= 1024;
}

/** Layout mobile — browser no celular (Safari, Brave, etc.) */
export function useTouchLayout(): boolean {
  const mediaMatch = useMediaQuery(TOUCH_LAYOUT_MQ);
  const [touchDevice, setTouchDevice] = useState(() => readTouchLayout());

  useEffect(() => {
    const sync = () => setTouchDevice(readTouchLayout());
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, [mediaMatch]);

  return mediaMatch || touchDevice;
}

/** Sincroniza classe no <html> para CSS mobile confiável no browser do celular */
export function useTouchLayoutClass(): boolean {
  const touchLayout = useTouchLayout();

  useEffect(() => {
    const root = document.documentElement;
    if (touchLayout) {
      root.dataset.touchLayout = 'true';
    } else {
      delete root.dataset.touchLayout;
    }
    return () => {
      delete root.dataset.touchLayout;
    };
  }, [touchLayout]);

  return touchLayout;
}

/** @deprecated use useTouchLayout */
export function useMobileUi() {
  return useTouchLayout();
}

export function isMobileUi(): boolean {
  return readTouchLayout();
}

export function isTouchUi(): boolean {
  return readTouchLayout();
}

export function isTouchLayout(): boolean {
  return readTouchLayout();
}

/** @deprecated use isTouchLayout */
export function isCoarsePointer(): boolean {
  return isTouchLayout();
}
