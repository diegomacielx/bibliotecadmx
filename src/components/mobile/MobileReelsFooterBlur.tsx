import { useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { getCoverPlaceholderStyle } from '../ExerciseCoverPlaceholder';

const NAV_SELECTOR = '.mobile-bottom-nav--floating';
const VIDEO_ROOT_SELECTOR = '.cinema-mobile-cover-player--reels-cover .dmx-yt-root';

function LetterboxBand({
  className,
  style,
}: {
  className: string;
  style?: CSSProperties;
}) {
  return (
    <div className={className} style={style} aria-hidden="true">
      <div className="mobile-reels-footer-blur__gradient">
        <div className="mobile-reels-footer-blur__mesh" aria-hidden="true" />
        <div className="mobile-reels-footer-blur__sheen" aria-hidden="true" />
      </div>
      <div className="mobile-reels-footer-blur__filter" />
    </div>
  );
}

/** Sincroniza altura do rodapé e faixas de letterbox com a nav e o vídeo reais. */
function syncPlaybackBands(): void {
  const nav = document.querySelector(NAV_SELECTOR);
  const viewportH = window.visualViewport?.height ?? window.innerHeight;
  const footerH = nav
    ? Math.ceil(viewportH - nav.getBoundingClientRect().top)
    : Math.ceil(parseFloat(getComputedStyle(document.documentElement).fontSize) * 4.25);

  document.documentElement.style.setProperty('--mobile-reels-footer-h', `${footerH}px`);

  const videoRoot = document.querySelector(VIDEO_ROOT_SELECTOR);
  if (videoRoot) {
    const rect = videoRoot.getBoundingClientRect();
    document.documentElement.style.setProperty('--mobile-reels-letterbox-top', `${Math.max(0, Math.round(rect.top))}px`);
    document.documentElement.style.setProperty(
      '--mobile-reels-letterbox-bottom',
      `${Math.min(viewportH, Math.round(rect.bottom))}px`
    );
  } else {
    const videoH = viewportH - footerH;
    document.documentElement.style.setProperty('--mobile-reels-letterbox-top', '0px');
    document.documentElement.style.setProperty('--mobile-reels-letterbox-bottom', `${videoH}px`);
  }
}

interface MobileReelsFooterBlurProps {
  exerciseId?: string;
  category?: string;
}

export function MobileReelsFooterBlur({ exerciseId, category }: MobileReelsFooterBlurProps) {
  const placeholderStyle = getCoverPlaceholderStyle(exerciseId, category);

  useEffect(() => {
    syncPlaybackBands();

    const nav = document.querySelector(NAV_SELECTOR);
    const videoRoot = document.querySelector(VIDEO_ROOT_SELECTOR);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncPlaybackBands) : null;
    if (nav && ro) ro.observe(nav);
    if (videoRoot && ro) ro.observe(videoRoot);

    window.addEventListener('resize', syncPlaybackBands);
    window.visualViewport?.addEventListener('resize', syncPlaybackBands);
    window.visualViewport?.addEventListener('scroll', syncPlaybackBands);

    const raf = requestAnimationFrame(syncPlaybackBands);
    const interval = window.setInterval(syncPlaybackBands, 400);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      ro?.disconnect();
      window.removeEventListener('resize', syncPlaybackBands);
      window.visualViewport?.removeEventListener('resize', syncPlaybackBands);
      window.visualViewport?.removeEventListener('scroll', syncPlaybackBands);
      document.documentElement.style.removeProperty('--mobile-reels-footer-h');
      document.documentElement.style.removeProperty('--mobile-reels-letterbox-top');
      document.documentElement.style.removeProperty('--mobile-reels-letterbox-bottom');
    };
  }, [exerciseId]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <LetterboxBand
        className="mobile-reels-letterbox-blur mobile-reels-letterbox-blur--top"
        style={placeholderStyle}
      />
      <div className="mobile-reels-footer-blur" style={placeholderStyle} aria-hidden="true">
        <div className="mobile-reels-footer-blur__gradient">
          <div className="mobile-reels-footer-blur__mesh" aria-hidden="true" />
          <div className="mobile-reels-footer-blur__sheen" aria-hidden="true" />
        </div>
        <div className="mobile-reels-footer-blur__filter" />
      </div>
    </>,
    document.body
  );
}
