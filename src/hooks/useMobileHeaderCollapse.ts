import { useEffect } from 'react';

const COLLAPSE_THRESHOLD = 56;

export function useMobileHeaderCollapse(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      document.documentElement.removeAttribute('data-mobile-header-collapsed');
      return;
    }

    const sync = () => {
      const collapsed = window.scrollY > COLLAPSE_THRESHOLD;
      document.documentElement.toggleAttribute('data-mobile-header-collapsed', collapsed);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => {
      window.removeEventListener('scroll', sync);
      document.documentElement.removeAttribute('data-mobile-header-collapsed');
    };
  }, [enabled]);
}
