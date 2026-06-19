import { useEffect, useMemo, useState, useRef, useCallback, type CSSProperties, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '../types';
import {
  getYouTubeId,
  isYouTubeShort,
  openYouTubeWatch,
  resolveVideoOrientation,
} from '../lib/utils';
import { isTypingTarget } from '../lib/keyboard';
import { prefetchExerciseNeighbors } from '../lib/exercisePrefetch';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTouchLayout } from '../hooks/useMediaQuery';
import { useTheme } from '../hooks/useTheme';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverFrameStyle } from '../lib/coverFocus';
import { ExerciseCoverPlaceholder } from './ExerciseCoverPlaceholder';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { VideoQualitySelect } from './VideoQualitySelect';
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
}

const VIDEO_H = 'min(92vh, 900px)';
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
}) {
  return (
    <div className="flex flex-col">
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

      <div className="lightbox-actions flex flex-col gap-2 pt-4 mt-4">
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

          {!compact && (
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
    </div>
  );
}

function MobileWatchPanel({ ex }: { ex: Exercise }) {
  const { imgSrc, coverMissing, handleLoad, handleError } = useExerciseCover(ex, { priority: 'high' });

  return (
    <div className="cinema-mobile-watch-panel">
      {coverMissing ? (
        <ExerciseCoverPlaceholder className="cinema-mobile-watch-poster cinema-mobile-watch-poster--placeholder" />
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
          className="cinema-mobile-watch-poster"
        />
      )}
      <div className="cinema-mobile-watch-gradient" aria-hidden="true" />
      <button
        type="button"
        className="cinema-mobile-watch-btn"
        onClick={() => openYouTubeWatch(ex.youtubeUrl)}
      >
        <span className="cinema-mobile-watch-btn-icon" aria-hidden="true">
          <Icon name="play" className="w-5 h-5 ml-0.5" strokeWidth={2} />
        </span>
        Assistir no YouTube
      </button>
    </div>
  );
}

function MobileExerciseSheet({
  ex,
  ytId,
  onClose,
  isCopied,
  onCopy,
  onDownload,
  isFavorite,
  onToggleFavorite,
  isAdmin,
  hasNav,
  navIndex,
  navTotal,
  onNavPrev,
  onNavNext,
  navPrevDisabled,
  navNextDisabled,
}: {
  ex: Exercise;
  ytId: string | null;
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
  return (
    <div className="cinema-mobile-sheet">
      <header className="cinema-mobile-sheet-header">
        <button
          type="button"
          onClick={onClose}
          className="cinema-mobile-back-btn cinema-mobile-back-btn--inline"
          aria-label="Voltar para início"
        >
          <Icon name="left" className="w-4 h-4" strokeWidth={2.25} />
        </button>
        <span className="cinema-mobile-sheet-header-label">Execução</span>
      </header>

      <div className="cinema-mobile-sheet-body">
        <ExerciseDetails
          ex={ex}
          isCopied={isCopied}
          onCopy={onCopy}
          onClose={onClose}
          onDownload={onDownload}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          isAdmin={isAdmin}
        />

        {hasNav && (
          <div className="cinema-mobile-nav">
            <button
              type="button"
              onClick={onNavPrev}
              disabled={navPrevDisabled}
              className="cinema-mobile-nav-btn"
              aria-label="Exercício anterior"
            >
              <Icon name="skipback" className="w-4 h-4" />
            </button>
            <span className="cinema-mobile-nav-counter tabular-nums">
              {navIndex + 1} / {navTotal}
            </span>
            <button
              type="button"
              onClick={onNavNext}
              disabled={navNextDisabled}
              className="cinema-mobile-nav-btn"
              aria-label="Próximo exercício"
            >
              <Icon name="skipforward" className="w-4 h-4" />
            </button>
          </div>
        )}

        {ytId ? (
          <MobileWatchPanel ex={ex} />
        ) : (
          <div className="cinema-mobile-watch-panel cinema-mobile-watch-panel--empty">
            <Icon name="youtube" className="w-10 h-10 text-zinc-500" strokeWidth={1} />
            <p className="text-2xs font-medium uppercase tracking-cinematic-wide text-zinc-500">
              Execução pendente
            </p>
          </div>
        )}
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
  isShort,
  mobileLayout = false,
}: {
  ex: Exercise;
  label: string;
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onSyncPlay: () => void;
  onPlayerReady: () => void;
  isShort: boolean;
  mobileLayout?: boolean;
}) {
  const ytId = getYouTubeId(ex.youtubeUrl);
  const orientation = resolveVideoOrientation(ex.youtubeUrl, {
    videoOrientation: ex.videoOrientation,
    aspectRatio: ex.aspectRatio,
  });
  const isVertical = orientation === 'vertical';
  const videoSizeStyle: CSSProperties | undefined = mobileLayout
    ? undefined
    : isVertical
      ? { height: 'min(70vh, 720px)', aspectRatio: '9 / 16' }
      : { height: 'min(50vh, 480px)', aspectRatio: '16 / 9' };

  return (
    <div className="compare-panel flex flex-col gap-2 min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2 min-w-0">
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
            <MobileWatchPanel ex={ex} />
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
                controls
                preferMaxQuality
                allowQualitySelection
                isShort={isShort}
                largeSurface
                onReady={onPlayerReady}
              />
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
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const isShort = isYouTubeShort(ex.youtubeUrl);
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
  }, [ex.firestoreId, compareEx?.firestoreId]);

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
    : isVertical
      ? {
          height: VIDEO_H,
          width: `min(calc(${VIDEO_H} * 9 / 16), calc(100vw - 24rem))`,
          aspectRatio: '9 / 16',
          flexShrink: 0,
        }
      : {
          height: VIDEO_H,
          width: `min(calc(${VIDEO_H} * 16 / 9), calc(100vw - 24rem))`,
          aspectRatio: '16 / 9',
          flexShrink: 0,
        };

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
        className={`cinema-lightbox-panel pointer-events-auto relative z-10 mx-auto flex flex-col md:flex-row md:items-stretch max-h-[94vh] overflow-hidden rounded-cinema ${
          isCompare ? 'compare-lightbox-panel' : 'cinema-lightbox-panel--single w-fit max-w-[min(calc(100vw-2rem),100%)]'
        } ${
          isMobileLayout ? 'cinema-lightbox-panel--mobile' : ''
        } ${isCompare ? 'compare-lightbox-panel' : ''}`}
        onMouseMove={isMobileLayout ? undefined : resetHideTimer}
        onWheel={isMobileLayout ? undefined : resetHideTimer}
      >
        {isMobileLayout && !isCompare ? (
          <MobileExerciseSheet
            ex={ex}
            ytId={ytId}
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
              isShort={isShort}
              mobileLayout={isMobileLayout}
            />
            <ComparePanel
              ex={compareEx}
              label="Exercício B"
              playerRef={comparePlayerRef}
              onSyncPlay={syncCompare}
              onPlayerReady={handleCompareSecondaryReady}
              isShort={isYouTubeShort(compareEx.youtubeUrl)}
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
                <MobileWatchPanel ex={ex} />
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
                      controls
                      preferMaxQuality
                      allowQualitySelection
                      isShort={isShort}
                      largeSurface
                      onReady={handlePrimaryPlayerReady}
                      onEnded={onVideoEnded}
                    />
                  </div>
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
                  {!isCompare && ytId && !isMobileLayout && (
                    <VideoQualitySelect playerRef={playerRef} readyToken={playerReadyToken} />
                  )}
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
