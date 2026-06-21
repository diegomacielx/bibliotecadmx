import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getCoverPlaceholderStyle } from '../ExerciseCoverPlaceholder';

const NAV_SELECTOR = '.mobile-bottom-nav--floating';

interface MobileReelsFooterBlurProps {
  exerciseId?: string;
  category?: string;
}

/** Sincroniza a altura da faixa do rodapé com a nav real (portals / safe-area). */
function syncFooterBandHeight(): void {
  const nav = document.querySelector(NAV_SELECTOR);
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const footerH = nav
    ? Math.ceil(viewportH - nav.getBoundingClientRect().top)
    : Math.ceil(parseFloat(getComputedStyle(document.documentElement).fontSize) * 4.25);

  document.documentElement.style.setProperty('--mobile-reels-footer-h', `${footerH}px`);
}

export function MobileReelsFooterBlur({ exerciseId, category }: MobileReelsFooterBlurProps) {
  const placeholderStyle = getCoverPlaceholderStyle(exerciseId, category);

  useEffect(() => {
    syncFooterBandHeight();

    const nav = document.querySelector(NAV_SELECTOR);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncFooterBandHeight) : null;
    if (nav && ro) ro.observe(nav);

    window.addEventListener('resize', syncFooterBandHeight);
    window.visualViewport?.addEventListener('resize', syncFooterBandHeight);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', syncFooterBandHeight);
      window.visualViewport?.removeEventListener('resize', syncFooterBandHeight);
      document.documentElement.style.removeProperty('--mobile-reels-footer-h');
    };
  }, [exerciseId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="mobile-reels-footer-blur"
      style={placeholderStyle}
      aria-hidden="true"
    >
      <div className="mobile-reels-footer-blur__gradient">
        <div className="mobile-reels-footer-blur__mesh" aria-hidden="true" />
        <div className="mobile-reels-footer-blur__sheen" aria-hidden="true" />
      </div>
      <div className="mobile-reels-footer-blur__filter" />
    </div>,
    document.body
  );
}
