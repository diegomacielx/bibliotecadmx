import { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect, type CSSProperties, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '../types';
import {
  getYouTubeId,
  resolveVideoOrientation,
} from '../lib/utils';
import { isTypingTarget } from '../lib/keyboard';
import { prefetchExerciseNeighbors } from '../lib/exercisePrefetch';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTouchLayout } from '../hooks/useMediaQuery';
import { useTheme } from '../hooks/useTheme';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { primeVideoPlaybackIntent } from '../lib/videoPlaybackPrime';
import { MobileMusclesDropup } from './mobile/MobileMusclesDropup';
import { getCoverPlaceholderStyle } from './ExerciseCoverPlaceholder';
import { MobileReelsFooterBlur } from './mobile/MobileReelsFooterBlur';
import { getCoverFrameStyle } from '../lib/coverFocus';
import { ExerciseCoverPlaceholder } from './ExerciseCoverPlaceholder';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { VideoProgressBar } from './VideoProgressBar';
import { Icon } from './Icon';
import { MuscleGroupList } from './MuscleGroupList';

interface CinemaLightboxProps {
  ex: Exercise;
  compareEx?: Exercise | null;
  onClose: () => void;
  copyLink: (url: string, firestoreId: string) => void;
  copiedId: string | null;
  onDownload: (ex: Exercise) => void;
  playlist?: Exercise[];
  playlistIndex?: number;
  onPlaylistNext?: () => void;
  onPlaylistPrev?: () => void;
  /** Lista atual (busca/categoria ou treino) para navegação ← → */
  navList?: Exercise[];
  navIndex?: number;
  onNavNext?: () => void;
  onNavPrev?: () => void;
  onVideoEnded?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isAdmin?: boolean;
  videoLoop?: boolean;
  compareLoopSync?: boolean;
}

const VIDEO_H = 'min(92vh, 900px)';
const COMPARE_STAGE_CHROME = '4.5rem';
/** Mesma altura do individual quando couber; reduz só o necessário para caber rótulos + padding */
const COMPARE_VIDEO_H = `min(92vh, 900px, calc(98vh - ${COMPARE_STAGE_CHROME}))`;
const COMPARE_VIDEO_WIDTH_CAP = 'calc((100vw - 24rem) / 2 - 0.5rem)';
const SINGLE_VIDEO_WIDTH_CAP = 'calc(100vw - 24rem)';

function getDesktopVideoSizeStyle(
  isVertical: boolean,
  mode: 'single' | 'compare'
): CSSProperties {
  const widthCap = mode === 'single' ? SINGLE_VIDEO_WIDTH_CAP : COMPARE_VIDEO_WIDTH_CAP;
  const videoHeightVar = mode === 'compare' ? COMPARE_VIDEO_H : VIDEO_H;

  if (isVertical) {
    return {
      ['--video-h' as string]: videoHeightVar,
      height: 'var(--video-h)',
      width: `min(calc(var(--video-h) * 9 / 16), ${widthCap})`,
      aspectRatio: '9 / 16',
      flexShrink: 0,
    };
  }

  return {
    ['--video-h' as string]: videoHeightVar,
    height: 'var(--video-h)',
    width: `min(calc(var(--video-h) * 16 / 9), ${widthCap})`,
    aspectRatio: '16 / 9',
    flexShrink: 0,
  };
}
const CONTROLS_HIDE_MS = 3200;
const SIDEBAR_SLIDE_EASE = [0.32, 0.72, 0, 1] as const;

/** Valores literais — o build de produção remove backdrop-filter do CSS e mantém só -webkit */
const CINEMA_BACKDROP_BLUR = {
  dark: 'blur(38px) saturate(1.1) brightness(0.86) contrast(0.94)',
  light: 'blur(40px) saturate(1.08) brightness(0.88) contrast(0.93)',
} as const;

function useMdUp() {
  const [isMdUp, setIsMdUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsMdUp(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return isMdUp;
}

function ExerciseDetails({
  ex,
  isCopied,
  onCopy,
  onClose,
  onDownload,
  isFavorite,
  onToggleFavorite,
  compact,
  isAdmin = false,
  section = 'full',
  hideClose = false,
}: {
  ex: Exercise;
  isCopied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onDownload: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  isAdmin?: boolean;
  /** Mobile sheet: render info, actions, or both */
  section?: 'full' | 'info' | 'actions';
  hideClose?: boolean;
}) {
  const showInfo = section === 'full' || section === 'info';
  const showActions = section === 'full' || section === 'actions';

  return (
    <div className="flex flex-col">
      {showInfo && (
      <div className="space-y-4">
        <div className="space-y-1.5 pr-6 min-w-0">
          <p className="lightbox-kicker">
            #{ex.id} · {ex.category}
          </p>
          <h2
            id={compact ? undefined : 'cinema-lightbox-title'}
            className={`lightbox-title ${compact ? 'lightbox-title--compact lightbox-title--wrap' : ''}`}
          >
            {ex.name}
          </h2>
        </div>

        {!compact && <MuscleGroupList groups={ex.muscleGroups} compact={compact} />}

        {isAdmin && !compact && ex.keywords && ex.keywords.length > 0 && (
          <div className="space-y-2">
            <h3 className="lightbox-section-label">
              Keywords
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {ex.keywords.map((k, i) => (
                <span
                  key={i}
                  className="lightbox-keyword-chip"
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {showActions && (
      <div className={`lightbox-actions flex flex-col gap-2 ${showInfo ? 'pt-4 mt-4' : ''}`}>
        {!compact && (
          <button
            type="button"
            onClick={onDownload}
            className="lightbox-btn lightbox-btn--primary w-full"
          >
            <Icon name="download" className="w-3.5 h-3.5" strokeWidth={1.75} />
            Baixar 4K
          </button>
        )}

        <div className="flex gap-2">
          {onToggleFavorite && !compact && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`lightbox-btn lightbox-btn--ghost px-3 ${
                isFavorite ? 'lightbox-btn--favorite-active' : ''
              }`}
              title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Icon name="heart" className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className={`lightbox-btn flex-1 ${
              isCopied ? 'lightbox-btn--success' : 'lightbox-btn--ghost'
            }`}
          >
            <Icon name={isCopied ? 'check' : 'copy'} className="w-3.5 h-3.5" strokeWidth={1.75} />
            {isCopied ? 'Copiado' : 'Copiar link'}
          </button>

          {compact && (
            <button
              type="button"
              onClick={onDownload}
              className="lightbox-btn lightbox-btn--ghost px-3 shrink-0"
              aria-label="Baixar 4K"
              title="Baixar 4K"
            >
              <Icon name="download" className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          )}

          {!compact && !hideClose && (
            <button
              type="button"
              onClick={onClose}
              className="lightbox-btn lightbox-btn--ghost px-4 shrink-0"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function MobileCoverPlayer({
  ex,
  ytId,
  hero = false,
  preview = false,
}: {
  ex: Exercise;
  ytId: string;
  hero?: boolean;
  preview?: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(hero && !preview);
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const { imgSrc, coverMissing, handleLoad, handleError } = useExerciseCover(ex, { priority: 'high' });
  const isVertical =
    resolveVideoOrientation(ex.youtubeUrl, {
      videoOrientation: ex.videoOrientation,
      aspectRatio: ex.aspectRatio,
    }) === 'vertical';

  useEffect(() => {
    setIsPlaying(hero && !preview);
  }, [ex.firestoreId, hero, preview]);

  useEffect(() => {
    if (!preview) primeVideoPlaybackIntent(ex);
  }, [ex, preview]);

  const handlePlay = () => {
    primeVideoPlaybackIntent(ex);
    setIsPlaying(true);
  };

  return (
    <div
      className={`cinema-mobile-cover-frame ${hero ? 'cinema-mobile-cover-frame--hero' : ''} ${
        isPlaying ? 'cinema-mobile-cover-frame--playing' : ''
      }`}
    >
      {isPlaying ? (
        <div
          className={`cinema-mobile-cover-player cinema-player-layer ${
            hero ? 'cinema-mobile-cover-player--reels-cover' : ''
          } ${
            hero && isVertical ? 'cinema-mobile-cover-player--vertical-theater cinema-player-layer--vertical-theater' : ''
          }`}
        >
          <YouTubePlayer
            ref={playerRef}
            videoId={ytId}
            title={ex.name}
            autoplay
            mute={false}
            controls={false}
            largeSurface
            mobileVertical={isVertical}
            onReady={() => playerRef.current?.playVideo()}
          />
          <button
            type="button"
            className="cinema-play-catch cinema-mobile-play-catch absolute inset-0 z-[2]"
            aria-label="Reproduzir ou pausar"
            onClick={(e) => {
              e.stopPropagation();
              playerRef.current?.togglePlay();
            }}
          />
        </div>
      ) : (
        <>
          {coverMissing ? (
            <ExerciseCoverPlaceholder className="cinema-mobile-cover-poster cinema-mobile-cover-poster--placeholder" />
          ) : (
            <img
              src={imgSrc}
              alt=""
              loading="eager"
              decoding="async"
              draggable={false}
              onLoad={handleLoad}
              onError={handleError}
              style={{
                objectPosition: getCoverFrameStyle(ex).objectPosition,
                ...(getCoverFrameStyle(ex).cssVars as React.CSSProperties),
              }}
              className="cinema-mobile-cover-poster"
            />
          )}
          {!preview && (
            <button
              type="button"
              className="cinema-mobile-yt-play-btn"
              onClick={handlePlay}
              aria-label="Reproduzir vídeo"
            >
              <Icon name="play" className="w-5 h-5 ml-0.5" strokeWidth={2} fill="currentColor" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

type ReelsSlideKind = 'prev' | 'current' | 'next';

interface ReelsSlide {
  ex: Exercise;
  kind: ReelsSlideKind;
}

function buildReelsSlides(navList: Exercise[], navIndex: number): ReelsSlide[] {
  const slides: ReelsSlide[] = [];
  if (navIndex > 0) slides.push({ ex: navList[navIndex - 1], kind: 'prev' });
  slides.push({ ex: navList[navIndex], kind: 'current' });
  if (navIndex < navList.length - 1) slides.push({ ex: navList[navIndex + 1], kind: 'next' });
  return slides;
}

function MobileReelsFeed({
  navList,
  navIndex,
  onNavPrev,
  onNavNext,
  navPrevDisabled,
  navNextDisabled,
}: {
  navList: Exercise[];
  navIndex: number;
  onNavPrev: () => void;
  onNavNext: () => void;
  navPrevDisabled: boolean;
  navNextDisabled: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigatingRef = useRef(false);
  const scrollEndTimerRef = useRef(0);

  const slides = useMemo(() => buildReelsSlides(navList, navIndex), [navList, navIndex]);

  const currentSlideIndex = useMemo(
    () => slides.findIndex((s) => s.kind === 'current'),
    [slides]
  );

  const scrollToSlide = useCallback((idx: number, behavior: ScrollBehavior = 'instant') => {
    const el = scrollRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h <= 0 || idx < 0) return;
    el.scrollTo({ top: idx * h, behavior });
  }, []);

  const setFeedScrolling = useCallback((active: boolean) => {
    if (typeof document === 'undefined') return;
    if (active) {
      document.documentElement.setAttribute('data-reels-feed-scrolling', 'true');
    } else {
      document.documentElement.removeAttribute('data-reels-feed-scrolling');
    }
  }, []);

  useLayoutEffect(() => {
    scrollToSlide(currentSlideIndex, 'instant');
  }, [navIndex, currentSlideIndex, scrollToSlide]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScrollEnd = () => {
      window.clearTimeout(scrollEndTimerRef.current);
      setFeedScrolling(false);

      if (navigatingRef.current) return;

      const h = el.clientHeight;
      if (h <= 0) return;

      const scrollIdx = Math.round(el.scrollTop / h);
      const slide = slides[scrollIdx];

      if (!slide || slide.kind === 'current') {
        const drift = Math.abs(el.scrollTop - currentSlideIndex * h);
        if (drift > 6) scrollToSlide(currentSlideIndex, 'smooth');
        return;
      }

      navigatingRef.current = true;
      if (slide.kind === 'prev' && !navPrevDisabled) {
        onNavPrev();
      } else if (slide.kind === 'next' && !navNextDisabled) {
        onNavNext();
      } else {
        navigatingRef.current = false;
        scrollToSlide(currentSlideIndex, 'smooth');
      }
    };

    const scheduleScrollEnd = () => {
      setFeedScrolling(true);
      window.clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = window.setTimeout(handleScrollEnd, 220);
    };

    const onTouchStart = () => setFeedScrolling(true);

    el.addEventListener('scroll', scheduleScrollEnd, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });

    return () => {
      el.removeEventListener('scroll', scheduleScrollEnd);
      el.removeEventListener('touchstart', onTouchStart);
      window.clearTimeout(scrollEndTimerRef.current);
      setFeedScrolling(false);
      navigatingRef.current = false;
    };
  }, [
    slides,
    currentSlideIndex,
    onNavPrev,
    onNavNext,
    navPrevDisabled,
    navNextDisabled,
    scrollToSlide,
    setFeedScrolling,
  ]);

  useEffect(() => {
    navigatingRef.current = false;
  }, [navIndex]);

  return (
    <div ref={scrollRef} className="mobile-reels-feed" aria-label="Feed de exercícios">
      {slides.map((slide) => {
        const slideYtId = getYouTubeId(slide.ex.youtubeUrl);
        const isActive = slide.kind === 'current';
        const placeholderStyle = getCoverPlaceholderStyle(slide.ex.id, slide.ex.category);

        return (
          <div
            key={`${slide.ex.firestoreId}-${slide.kind}`}
            className="mobile-reels-feed__slide"
            style={placeholderStyle}
            data-reels-slide={slide.kind}
          >
            {slideYtId ? (
              <MobileCoverPlayer ex={slide.ex} ytId={slideYtId} hero preview={!isActive} />
            ) : (
              <div className="cinema-mobile-cover-frame cinema-mobile-cover-frame--hero cinema-mobile-cover-frame--empty">
                <Icon name="youtube" className="w-10 h-10 text-zinc-500" strokeWidth={1} />
                <p className="text-2xs font-medium uppercase tracking-cinematic-wide text-zinc-500">
                  Execução pendente
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MobileExerciseSheet({
  ex,
  ytId,
  navList,
  isCopied,
  onCopy,
  onDownload,
  isFavorite,
  onToggleFavorite,
  hasNav,
  navIndex,
  onNavPrev,
  onNavNext,
  navPrevDisabled,
  navNextDisabled,
}: {
  ex: Exercise;
  ytId: string | null;
  navList: Exercise[];
  onClose: () => void;
  isCopied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isAdmin?: boolean;
  hasNav: boolean;
  navIndex: number;
  navTotal: number;
  onNavPrev: () => void;
  onNavNext: () => void;
  navPrevDisabled: boolean;
  navNextDisabled: boolean;
}) {
  const [musclesOpen, setMusclesOpen] = useState(false);
  const useVerticalFeed = hasNav && navList.length > 1;

  useEffect(() => {
    setMusclesOpen(false);
  }, [ex.firestoreId]);

  const stagePlaceholderStyle = getCoverPlaceholderStyle(ex.id, ex.category);

  return (
    <div className="cinema-mobile-sheet cinema-mobile-sheet--reels" style={stagePlaceholderStyle}>
      <div className="cinema-mobile-reels-stage" style={stagePlaceholderStyle}>
        {useVerticalFeed ? (
          <MobileReelsFeed
            navList={navList}
            navIndex={navIndex}
            onNavPrev={onNavPrev}
            onNavNext={onNavNext}
            navPrevDisabled={navPrevDisabled}
            navNextDisabled={navNextDisabled}
          />
        ) : ytId ? (
          <MobileCoverPlayer ex={ex} ytId={ytId} hero />
        ) : (
          <div className="cinema-mobile-cover-frame cinema-mobile-cover-frame--hero cinema-mobile-cover-frame--empty">
            <Icon name="youtube" className="w-10 h-10 text-zinc-500" strokeWidth={1} />
            <p className="text-2xs font-medium uppercase tracking-cinematic-wide text-zinc-500">
              Execução pendente
            </p>
          </div>
        )}

        <div className="cinema-mobile-reels-top">
          <h1 className="cinema-mobile-reels-title">{ex.name}</h1>
        </div>

        <MobileReelsFooterBlur exerciseId={ex.id} category={ex.category} />

        <div className="cinema-mobile-reels-rail">
          <MobileMusclesDropup
            groups={ex.muscleGroups}
            open={musclesOpen}
            onOpen={() => setMusclesOpen(true)}
            onClose={() => setMusclesOpen(false)}
          />
          <button
            type="button"
            className="cinema-mobile-reels-rail-btn"
            onClick={onDownload}
            aria-label="Baixar 4K"
            title="Baixar 4K"
          >
            <Icon name="download" className="w-6 h-6" strokeWidth={1.75} />
          </button>
          {onToggleFavorite && (
            <button
              type="button"
              className={`cinema-mobile-reels-rail-btn ${
                isFavorite ? 'cinema-mobile-reels-rail-btn--active' : ''
              }`}
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
              aria-pressed={isFavorite}
            >
              <Icon
                name="heart"
                className="w-6 h-6"
                strokeWidth={1.75}
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </button>
          )}
          <button
            type="button"
            className={`cinema-mobile-reels-rail-btn ${
              isCopied ? 'cinema-mobile-reels-rail-btn--success' : ''
            }`}
            onClick={onCopy}
            aria-label={isCopied ? 'Link copiado' : 'Copiar link'}
            title={isCopied ? 'Copiado' : 'Copiar link'}
          >
            <Icon name={isCopied ? 'check' : 'copy'} className="w-6 h-6" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparePanel({
  ex,
  label,
  playerRef,
  onSyncPlay,
  onPlayerReady,
  onEnded,
  mobileLayout = false,
}: {
  ex: Exercise;
  label: string;
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onSyncPlay: () => void;
  onPlayerReady: () => void;
  onEnded?: () => void;
  mobileLayout?: boolean;
}) {
  const [readyToken, setReadyToken] = useState(0);
  const ytId = getYouTubeId(ex.youtubeUrl);
  const orientation = resolveVideoOrientation(ex.youtubeUrl, {
    videoOrientation: ex.videoOrientation,
    aspectRatio: ex.aspectRatio,
  });
  const isVertical = orientation === 'vertical';
  const videoSizeStyle: CSSProperties | undefined = mobileLayout
    ? undefined
    : getDesktopVideoSizeStyle(isVertical, 'compare');

  return (
    <div className="compare-panel flex flex-col gap-2 min-w-0 flex-1">
      <div className="compare-panel-head flex items-center justify-between gap-2 min-w-0 shrink-0">
        <p className="compare-panel-label">{label}</p>
        <button
          type="button"
          onClick={onSyncPlay}
          className="compare-sync-btn shrink-0"
          title="Sincronizar play/pause nos dois"
        >
          <Icon name="play" className="w-3 h-3" />
        </button>
      </div>
      <div
        className={`compare-panel-video relative shrink-0 w-full overflow-hidden rounded-xl ring-1 ring-white/10 ${
          mobileLayout
            ? isVertical
              ? 'compare-panel-video--mobile-vertical bg-canvas-sunken'
              : 'compare-panel-video--mobile bg-canvas-sunken'
            : 'compare-panel-video--desktop'
        }`}
        style={videoSizeStyle}
      >
        {ytId ? (
          mobileLayout ? (
            <MobileCoverPlayer ex={ex} ytId={ytId} />
          ) : (
            <div
              className={`absolute inset-0 ${
                isVertical ? 'cinema-player-layer cinema-player-layer--vertical-theater' : ''
              }`}
            >
              <YouTubePlayer
                ref={playerRef}
                videoId={ytId}
                title={ex.name}
                autoplay
                deferAutoplay
                mute={false}
                controls={false}
                largeSurface
                onReady={() => {
                  setReadyToken((t) => t + 1);
                  onPlayerReady();
                }}
                onEnded={onEnded}
              />
              <button
                type="button"
                className="cinema-play-catch absolute inset-0 z-[2]"
                aria-label="Reproduzir ou pausar"
                onClick={(e) => {
                  e.stopPropagation();
                  playerRef.current?.togglePlay();
                }}
              />
              <div className="cinema-overlay-controls">
                <VideoProgressBar playerRef={playerRef} readyToken={readyToken} visible />
              </div>
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-xs">
            Pendente
          </div>
        )}
      </div>
    </div>
  );
}

export function CinemaLightbox({
  ex,
  compareEx,
  onClose,
  copyLink,
  copiedId,
  onDownload,
  playlist = [],
  playlistIndex = 0,
  onPlaylistNext,
  onPlaylistPrev,
  navList = [],
  navIndex = 0,
  onNavNext,
  onNavPrev,
  onVideoEnded,
  isFavorite,
  onToggleFavorite,
  isAdmin = false,
  videoLoop = false,
  compareLoopSync = false,
}: CinemaLightboxProps) {
  const reducedMotion = useReducedMotion();
  const isMobileLayout = useTouchLayout();
  const isMdUp = useMdUp();
  const { theme } = useTheme();
  const isCompare = !!compareEx;
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const comparePlayerRef = useRef<YouTubePlayerHandle>(null);
  const compareReadyRef = useRef({ primary: false, secondary: false });
  const compareSyncStartedRef = useRef(false);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [playerReadyToken, setPlayerReadyToken] = useState(0);
  const [showReplay, setShowReplay] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoLoopRef = useRef(videoLoop);
  const compareLoopSyncRef = useRef(compareLoopSync);

  useEffect(() => {
    videoLoopRef.current = videoLoop;
  }, [videoLoop]);

  useEffect(() => {
    compareLoopSyncRef.current = compareLoopSync;
  }, [compareLoopSync]);

  const orientation = useMemo(
    () =>
      resolveVideoOrientation(ex.youtubeUrl, {
        videoOrientation: ex.videoOrientation,
        aspectRatio: ex.aspectRatio,
      }),
    [ex.youtubeUrl, ex.videoOrientation, ex.aspectRatio]
  );

  const isVertical = orientation === 'vertical';
  const ytId = getYouTubeId(ex.youtubeUrl);
  const isCopied = copiedId === ex.firestoreId;
  const effectiveNavList = navList.length > 1 ? navList : playlist.length > 1 ? playlist : [];
  const effectiveNavIndex = navList.length > 1 ? navIndex : playlistIndex;
  const effectiveNavNext = navList.length > 1 ? onNavNext : onPlaylistNext;
  const effectiveNavPrev = navList.length > 1 ? onNavPrev : onPlaylistPrev;
  const hasNav = effectiveNavList.length > 1;

  useEffect(() => {
    if (isMobileLayout || !hasNav) return;
    prefetchExerciseNeighbors(effectiveNavList, effectiveNavIndex);
  }, [ex.firestoreId, effectiveNavIndex, effectiveNavList, isMobileLayout, hasNav]);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    setSidebarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      if (!isMobileLayout) setSidebarVisible(false);
    }, CONTROLS_HIDE_MS);
  }, [isMobileLayout]);

  const handlePrimaryPlayerReady = useCallback(() => {
    resetHideTimer();
    setPlayerReadyToken((n) => n + 1);
    playerRef.current?.playVideo();
  }, [resetHideTimer]);

  useEffect(() => {
    if (!isMobileLayout) return;
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout) setSidebarVisible(true);
  }, [isMobileLayout, ex.firestoreId]);

  useEffect(() => {
    compareReadyRef.current = { primary: false, secondary: false };
    compareSyncStartedRef.current = false;
    setPlayerReadyToken(0);
    setShowReplay(false);
  }, [ex.firestoreId, compareEx?.firestoreId]);

  useEffect(() => {
    setShowReplay(false);
  }, [videoLoop]);

  const startComparePlayback = useCallback(() => {
    if (compareSyncStartedRef.current) return;
    if (!compareReadyRef.current.primary || !compareReadyRef.current.secondary) return;
    compareSyncStartedRef.current = true;
    playerRef.current?.seekTo(0);
    comparePlayerRef.current?.seekTo(0);
    playerRef.current?.playVideo();
    comparePlayerRef.current?.playVideo();
  }, []);

  const handleComparePrimaryReady = useCallback(() => {
    compareReadyRef.current.primary = true;
    startComparePlayback();
  }, [startComparePlayback]);

  const handleCompareSecondaryReady = useCallback(() => {
    compareReadyRef.current.secondary = true;
    startComparePlayback();
  }, [startComparePlayback]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer, ex.firestoreId]);

  useEffect(() => {
    if (isMobileLayout) return;
    const onMove = () => resetHideTimer();
    document.addEventListener('mousemove', onMove, { passive: true });
    return () => document.removeEventListener('mousemove', onMove);
  }, [isMobileLayout, resetHideTimer]);

  const handleNavPrev = useCallback(() => {
    effectiveNavPrev?.();
    resetHideTimer();
  }, [effectiveNavPrev, resetHideTimer]);

  const handleNavNext = useCallback(() => {
    effectiveNavNext?.();
    resetHideTimer();
  }, [effectiveNavNext, resetHideTimer]);

  const handlePlayerEnded = useCallback(() => {
    if (videoLoopRef.current) {
      playerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
      setShowReplay(false);
      return;
    }

    if (playlist.length > 1 && playlistIndex < playlist.length - 1 && onVideoEnded) {
      onVideoEnded();
      return;
    }

    setShowReplay(true);
    resetHideTimer();
  }, [playlist.length, playlistIndex, onVideoEnded, resetHideTimer]);

  const handleComparePlayerEnded = useCallback((slot: 'primary' | 'secondary') => {
    if (!videoLoopRef.current) return;

    if (compareLoopSyncRef.current) {
      playerRef.current?.seekTo(0);
      comparePlayerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
      comparePlayerRef.current?.playVideo();
      return;
    }

    const target = slot === 'primary' ? playerRef : comparePlayerRef;
    target.current?.seekTo(0);
    target.current?.playVideo();
  }, []);

  const handleReplay = useCallback(() => {
    playerRef.current?.seekTo(0);
    playerRef.current?.playVideo();
    setShowReplay(false);
    resetHideTimer();
  }, [resetHideTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        playerRef.current?.togglePlay();
        if (isCompare) comparePlayerRef.current?.togglePlay();
        resetHideTimer();
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const stage = videoAreaRef.current;
        const fsTarget = stage as (HTMLElement & { webkitRequestFullscreen?: () => void }) | null;
        if (fsTarget?.requestFullscreen) {
          void fsTarget.requestFullscreen().catch(() => {
            playerRef.current?.requestFullscreen();
          });
        } else if (fsTarget?.webkitRequestFullscreen) {
          fsTarget.webkitRequestFullscreen();
        } else {
          playerRef.current?.requestFullscreen();
        }
        resetHideTimer();
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (onToggleFavorite) {
          e.preventDefault();
          onToggleFavorite();
          resetHideTimer();
        }
        return;
      }
      if (e.key === 'ArrowRight' && hasNav && effectiveNavNext) {
        e.preventDefault();
        handleNavNext();
      }
      if (e.key === 'ArrowLeft' && hasNav && effectiveNavPrev) {
        e.preventDefault();
        handleNavPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    onClose,
    onToggleFavorite,
    resetHideTimer,
    isCompare,
    hasNav,
    handleNavNext,
    handleNavPrev,
  ]);

  const panelOpenTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.06, ease: [0.22, 1, 0.36, 1] as const };

  const sidebarTransition = reducedMotion
    ? { duration: 0.1 }
    : { duration: 0.44, ease: SIDEBAR_SLIDE_EASE };

  const sidebarMotion = isMdUp
    ? {
        initial: { opacity: 0, x: -28 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: '-108%' },
      }
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -36 },
      };

  const handleBackdropWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    window.scrollBy({ top: e.deltaY, left: e.deltaX, behavior: 'auto' });
  }, []);

  const syncCompare = () => {
    const state = playerRef.current?.getPlayerState();
    if (state === 1) {
      playerRef.current?.pauseVideo();
      comparePlayerRef.current?.pauseVideo();
    } else {
      playerRef.current?.playVideo();
      comparePlayerRef.current?.playVideo();
    }
    resetHideTimer();
  };

  const videoSizeStyle: CSSProperties = isMobileLayout
    ? {}
    : getDesktopVideoSizeStyle(isVertical, 'single');

  const showMobileSheet = isMobileLayout && !isCompare;
  const showSidebar = showMobileSheet ? false : isMobileLayout || sidebarVisible;

  const backdropFxStyle = useMemo((): CSSProperties => {
    const filter = CINEMA_BACKDROP_BLUR[theme === 'light' ? 'light' : 'dark'];
    return {
      backdropFilter: filter,
      WebkitBackdropFilter: filter,
    };
  }, [theme]);

  return createPortal(
    <>
      {!isMobileLayout && (
        <div
          className="cinema-backdrop cinema-backdrop--portal"
          onClick={onClose}
          onWheel={handleBackdropWheel}
          aria-hidden="true"
        >
          <div className="cinema-backdrop__fx" style={backdropFxStyle} aria-hidden="true" />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={panelOpenTransition}
        className={`cinema-lightbox fixed inset-0 z-[200] flex overflow-hidden ${
          isMobileLayout
            ? 'cinema-lightbox--mobile pointer-events-auto flex-col p-0'
            : 'pointer-events-none items-center justify-center p-2 sm:p-4'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={isMobileLayout ? undefined : 'cinema-lightbox-title'}
        onMouseMove={isMobileLayout ? undefined : resetHideTimer}
        onWheel={isMobileLayout ? undefined : resetHideTimer}
      >
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={panelOpenTransition}
        className={`cinema-lightbox-panel pointer-events-auto relative z-10 mx-auto flex flex-col md:flex-row md:items-stretch overflow-hidden rounded-cinema ${
          isCompare
            ? 'compare-lightbox-panel'
            : 'cinema-lightbox-panel--single w-fit max-w-[min(calc(100vw-2rem),100%)] max-h-[94vh]'
        } ${
          isMobileLayout ? 'cinema-lightbox-panel--mobile' : ''
        }`}
        onMouseMove={isMobileLayout ? undefined : resetHideTimer}
        onWheel={isMobileLayout ? undefined : resetHideTimer}
      >
        {isMobileLayout && !isCompare ? (
          <MobileExerciseSheet
            ex={ex}
            ytId={ytId}
            navList={effectiveNavList}
            onClose={onClose}
            isCopied={isCopied}
            onCopy={() => copyLink(ex.youtubeUrl, ex.firestoreId)}
            onDownload={() => onDownload(ex)}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            isAdmin={isAdmin}
            hasNav={hasNav}
            navIndex={effectiveNavIndex}
            navTotal={effectiveNavList.length}
            onNavPrev={handleNavPrev}
            onNavNext={handleNavNext}
            navPrevDisabled={effectiveNavIndex <= 0}
            navNextDisabled={effectiveNavIndex >= effectiveNavList.length - 1}
          />
        ) : isCompare && compareEx ? (
          <div
            className={
              isMobileLayout
                ? 'cinema-lightbox-compare-layout'
                : 'compare-lightbox-stage cinema-lightbox-compare-inner'
            }
          >
            <ComparePanel
              ex={ex}
              label="Exercício A"
              playerRef={playerRef}
              onSyncPlay={syncCompare}
              onPlayerReady={handleComparePrimaryReady}
              onEnded={() => handleComparePlayerEnded('primary')}
              mobileLayout={isMobileLayout}
            />
            <ComparePanel
              ex={compareEx}
              label="Exercício B"
              playerRef={comparePlayerRef}
              onSyncPlay={syncCompare}
              onPlayerReady={handleCompareSecondaryReady}
              onEnded={() => handleComparePlayerEnded('secondary')}
              mobileLayout={isMobileLayout}
            />
          </div>
        ) : (
          <div
            ref={videoAreaRef}
            className={`cinema-video-stage relative shrink-0 w-full md:w-auto overflow-hidden cinema-video-area ${
              isMobileLayout ? 'cinema-video-area--mobile' : ''
            } ${!isMobileLayout && isVertical ? 'cinema-video-stage--vertical' : ''} ${
              isVertical && isMobileLayout ? 'cinema-video-area--mobile-vertical' : ''
            }`}
            style={isMobileLayout ? undefined : videoSizeStyle}
          >
            {isMobileLayout && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="cinema-mobile-back-btn"
                aria-label="Voltar para início"
              >
                <Icon name="left" className="w-4 h-4" strokeWidth={2.25} />
              </button>
            )}

            {ytId ? (
              isMobileLayout ? (
                <MobileCoverPlayer ex={ex} ytId={ytId} />
              ) : (
                <>
                  <div
                    className={`cinema-player-layer absolute inset-0 z-[1] ${
                      isVertical ? 'cinema-player-layer--vertical-theater' : ''
                    }`}
                  >
                    <YouTubePlayer
                      ref={playerRef}
                      videoId={ytId}
                      title={ex.name}
                      autoplay
                      mute={false}
                      controls={false}
                      largeSurface
                      onReady={handlePrimaryPlayerReady}
                      onEnded={handlePlayerEnded}
                      onPlayStateChange={(playing) => {
                        if (playing) setShowReplay(false);
                      }}
                    />
                  </div>
                  {!showReplay && (
                    <button
                      type="button"
                      className="cinema-play-catch absolute inset-0 z-[2]"
                      aria-label="Reproduzir ou pausar"
                      onClick={(e) => {
                        e.stopPropagation();
                        playerRef.current?.togglePlay();
                        resetHideTimer();
                      }}
                    />
                  )}
                  {showReplay && (
                    <div className="cinema-replay-overlay absolute inset-0 z-[3] flex items-center justify-center">
                      <button
                        type="button"
                        className="cinema-replay-btn"
                        aria-label="Reproduzir novamente"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReplay();
                        }}
                      >
                        <Icon name="replay" className="w-7 h-7" strokeWidth={2} />
                      </button>
                    </div>
                  )}
                </>
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 glass-panel">
                <Icon name="youtube" className="w-10 h-10 text-zinc-500" strokeWidth={1} />
                <p className="text-2xs font-medium uppercase tracking-cinematic-wide text-zinc-500">
                  Execução pendente
                </p>
              </div>
            )}

            <div className="cinema-overlay-controls">
              {hasNav && !isMobileLayout && (
                <div className="cinema-playlist-nav-anchor">
                  <AnimatePresence>
                    {controlsVisible && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="cinema-playlist-nav"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavPrev();
                          }}
                          disabled={effectiveNavIndex <= 0}
                          className="cinema-control-btn liquid-glass-btn"
                          aria-label="Exercício anterior"
                        >
                          <Icon name="skipback" className="w-4 h-4" />
                        </button>
                        <span className="cinema-playlist-nav-counter tabular-nums">
                          {effectiveNavIndex + 1} / {effectiveNavList.length}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavNext();
                          }}
                          disabled={effectiveNavIndex >= effectiveNavList.length - 1}
                          className="cinema-control-btn liquid-glass-btn"
                          aria-label="Próximo exercício"
                        >
                          <Icon name="skipforward" className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {ytId && !isMobileLayout && (
                <VideoProgressBar
                  playerRef={playerRef}
                  readyToken={playerReadyToken}
                  visible={controlsVisible}
                  onInteract={resetHideTimer}
                />
              )}
            </div>
          </div>
        )}

        <AnimatePresence mode="sync">
          {showSidebar && (
            <motion.aside
              {...(isMobileLayout ? {} : sidebarMotion)}
              transition={isMobileLayout ? { duration: 0 } : sidebarTransition}
              className={`cinema-lightbox-sidebar relative flex flex-col w-full shrink-0 self-stretch p-5 md:p-6 min-h-full overflow-y-auto overflow-x-hidden no-scrollbar ${
                isMobileLayout
                  ? 'cinema-lightbox-sidebar--mobile'
                  : isCompare
                    ? 'cinema-lightbox-sidebar--compare'
                    : 'md:w-[min(360px,32vw)]'
              } ${isCompare && isMobileLayout ? 'cinema-lightbox-sidebar--compare-mobile' : ''}`}
            >
              {!isMobileLayout && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="lightbox-close-mobile absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full md:hidden"
                >
                  <Icon name="x" className="w-4 h-4" strokeWidth={1.75} />
                </button>
              )}

              {isCompare && compareEx ? (
                <div className="flex flex-col min-h-full pb-10 min-w-0">
                  <div className="space-y-5 flex-1 min-h-0 min-w-0">
                    <p className="compare-panel-label compare-panel-label--mode">
                      Modo comparador
                    </p>
                    <div className="compare-sidebar-card">
                      <p className="compare-slot-label">Exercício A</p>
                      <ExerciseDetails
                    ex={ex}
                    isCopied={isCopied}
                    onCopy={() => copyLink(ex.youtubeUrl, ex.firestoreId)}
                    onClose={onClose}
                    onDownload={() => onDownload(ex)}
                    compact
                    isAdmin={isAdmin}
                  />
                    </div>
                  <div className="compare-sidebar-card compare-sidebar-card--b">
                    <p className="compare-slot-label">Exercício B</p>
                    <ExerciseDetails
                      ex={compareEx}
                      isCopied={copiedId === compareEx.firestoreId}
                      onCopy={() => copyLink(compareEx.youtubeUrl, compareEx.firestoreId)}
                      onClose={onClose}
                      onDownload={() => onDownload(compareEx)}
                      compact
                      isAdmin={isAdmin}
                    />
                  </div>
                  </div>
                  <p className="cinema-shortcuts-hint cinema-shortcuts-hint--sidebar mt-4 text-center shrink-0 hidden md:block">
                    Pressione <kbd>Esc</kbd> para fechar
                  </p>
                </div>
              ) : (
                <div className="flex flex-col min-h-full">
                  <ExerciseDetails
                    ex={ex}
                    isCopied={isCopied}
                    onCopy={() => copyLink(ex.youtubeUrl, ex.firestoreId)}
                    onClose={onClose}
                    onDownload={() => onDownload(ex)}
                    isFavorite={isFavorite}
                    onToggleFavorite={onToggleFavorite}
                    isAdmin={isAdmin}
                  />
                  <AnimatePresence>
                    {!isMobileLayout && controlsVisible && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="cinema-shortcuts-hint cinema-shortcuts-hint--sidebar mt-auto pt-4 shrink-0"
                      >
                        <kbd>F</kbd> favoritar · <kbd>Esc</kbd> fechar
                        {hasNav && (
                          <>
                            {' '}
                            · <kbd>←</kbd> <kbd>→</kbd> exercícios
                          </>
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
    </>,
    document.body
  );
}
