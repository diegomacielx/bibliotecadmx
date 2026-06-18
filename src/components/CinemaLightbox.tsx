import { useEffect, useMemo, useState, useRef, useCallback, type CSSProperties, type WheelEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '../types';
import {
  getYouTubeId,
  isYouTubeShort,
  openYouTubeWatch,
  resolveVideoOrientation,
} from '../lib/utils';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTouchLayout } from '../hooks/useMediaQuery';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverObjectPosition } from '../lib/coverFocus';
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer';
import { Icon } from './Icon';
import { MuscleGroupList } from './MuscleGroupList';

interface CinemaLightboxProps {
  ex: Exercise;
  compareEx?: Exercise | null;
  onClose: () => void;
  copyLink: (url: string, firestoreId: string) => void;
  copiedId: string | null;
  onDownload: (ex: Exercise, quality: string) => void;
  onDownloadUnavailable?: (ex: Exercise, quality: string) => void;
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
const DOWNLOAD_QUALITIES = ['4K', '1080p', '720p', '480p'] as const;
const CONTROLS_HIDE_MS = 3200;
const SIDEBAR_SLIDE_EASE = [0.32, 0.72, 0, 1] as const;

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
  onDownloadUnavailable,
  isFavorite,
  onToggleFavorite,
  compact,
  isAdmin = false,
}: {
  ex: Exercise;
  isCopied: boolean;
  onCopy: () => void;
  onClose: () => void;
  onDownload: (quality: string) => void;
  onDownloadUnavailable?: (quality: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  compact?: boolean;
  isAdmin?: boolean;
}) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  return (
    <div className="flex flex-col">
      <div className="space-y-4">
        <div className="space-y-1.5 pr-6">
          <p className="lightbox-kicker">
            #{ex.id} · {ex.category}
          </p>
          <h2
            id="cinema-lightbox-title"
            className={`lightbox-title font-display font-semibold tracking-cinematic leading-snug ${
              compact ? 'text-sm' : 'text-lg md:text-xl'
            }`}
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
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => onDownload('4K')}
                  className="lightbox-btn lightbox-btn--primary w-full"
                >
                  <Icon name="download" className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Baixar 4K
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadMenu((v) => !v)}
                className="lightbox-btn lightbox-btn--ghost px-3"
                aria-expanded={showDownloadMenu}
                title="Outras qualidades"
              >
                <Icon name="chevrondown" className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence>
              {showDownloadMenu && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-1.5 pb-1">
                    {DOWNLOAD_QUALITIES.slice(1).map((quality) => (
                      <button
                        key={quality}
                        type="button"
                        onClick={() => {
                          setShowDownloadMenu(false);
                          if (onDownloadUnavailable) onDownloadUnavailable(quality);
                          else onDownload(quality);
                        }}
                        className="lightbox-btn lightbox-btn--ghost lightbox-btn--quality"
                      >
                        {quality}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
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
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowDownloadMenu((v) => !v)}
                className={`lightbox-btn lightbox-btn--ghost px-3 ${
                  showDownloadMenu ? 'lightbox-btn--ghost-active' : ''
                }`}
                aria-expanded={showDownloadMenu}
                aria-label="Baixar vídeo"
                title="Baixar vídeo"
              >
                <Icon name="download" className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>

              <AnimatePresence>
                {showDownloadMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 4 }}
                    transition={{ duration: 0.18 }}
                    className="lightbox-download-menu-compact dropdown-panel"
                  >
                    {DOWNLOAD_QUALITIES.map((quality) => (
                      <button
                        key={quality}
                        type="button"
                        className="lightbox-download-menu-compact__item"
                        onClick={() => {
                          setShowDownloadMenu(false);
                          if (quality !== '4K' && onDownloadUnavailable) {
                            onDownloadUnavailable(quality);
                          } else {
                            onDownload(quality);
                          }
                        }}
                      >
                        {quality}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
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
  const { imgSrc, handleLoad, handleError } = useExerciseCover(ex);

  return (
    <div className="cinema-mobile-watch-panel">
      <img
        src={imgSrc}
        alt=""
        loading="eager"
        decoding="async"
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
        style={{ objectPosition: getCoverObjectPosition(ex) }}
        className="cinema-mobile-watch-poster"
      />
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
      <div className="flex items-center justify-between gap-2">
        <p className="compare-panel-label">{label}</p>
        <button
          type="button"
          onClick={onSyncPlay}
          className="compare-sync-btn"
          title="Sincronizar play/pause nos dois"
        >
          <Icon name="play" className="w-3 h-3" />
        </button>
      </div>
      <p className="lightbox-title text-xs truncate">{ex.name}</p>
      <div
        className={`compare-panel-video relative shrink-0 w-full overflow-hidden rounded-xl bg-canvas-sunken ring-1 ring-white/10 ${
          mobileLayout
            ? isVertical
              ? 'compare-panel-video--mobile-vertical'
              : 'compare-panel-video--mobile'
            : ''
        }`}
        style={videoSizeStyle}
      >
        {ytId ? (
          <YouTubePlayer
            ref={playerRef}
            videoId={ytId}
            title={ex.name}
            autoplay
            deferAutoplay
            mute={false}
            controls
            preferMaxQuality
            isShort={isShort}
            largeSurface
            onReady={onPlayerReady}
          />
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
  onDownloadUnavailable,
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
  const isCompare = !!compareEx;
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const comparePlayerRef = useRef<YouTubePlayerHandle>(null);
  const compareReadyRef = useRef({ primary: false, secondary: false });
  const compareSyncStartedRef = useRef(false);
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
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

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    setSidebarVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      if (!isMobileLayout) setSidebarVisible(false);
    }, CONTROLS_HIDE_MS);
  }, [isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout) setSidebarVisible(true);
  }, [isMobileLayout, ex.firestoreId]);

  useEffect(() => {
    compareReadyRef.current = { primary: false, secondary: false };
    compareSyncStartedRef.current = false;
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
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        playerRef.current?.requestFullscreen();
        resetHideTimer();
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
  }, [onClose, resetHideTimer, isCompare, hasNav, handleNavNext, handleNavPrev]);

  const spring = reducedMotion
    ? { duration: 0.08 }
    : { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.62 };

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
      ? { height: VIDEO_H, aspectRatio: '9 / 16' }
      : { height: VIDEO_H, aspectRatio: '16 / 9' };

  const showSidebar = isMobileLayout || sidebarVisible;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1, ease: [0.22, 1, 0.36, 1] }}
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
      onScroll={isMobileLayout ? undefined : resetHideTimer}
    >
      {!isMobileLayout && (
        <motion.div
          className="absolute inset-0 cinema-backdrop pointer-events-auto"
          onClick={onClose}
          onWheel={handleBackdropWheel}
          aria-hidden="true"
        />
      )}

      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, y: 6 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99, y: 4 }}
        transition={spring}
        className={`cinema-lightbox-panel pointer-events-auto relative z-10 mx-auto flex flex-col md:flex-row md:items-stretch w-fit max-w-[calc(100vw-1rem)] max-h-[94vh] overflow-hidden rounded-cinema ${
          isMobileLayout ? 'cinema-lightbox-panel--mobile' : ''
        } ${isCompare ? 'compare-lightbox-panel' : ''}`}
      >
        {isCompare && compareEx ? (
          <div
            className={
              isMobileLayout
                ? 'cinema-lightbox-compare-layout'
                : 'flex flex-col lg:flex-row gap-4 p-4 cinema-lightbox-compare-inner w-full'
            }
          >
            <div className={isMobileLayout ? 'cinema-compare-videos-row' : 'contents'}>
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
          </div>
        ) : (
          <div
            ref={videoAreaRef}
            className={`cinema-video-stage relative shrink-0 w-full md:w-auto overflow-hidden cinema-video-area ${
              isMobileLayout ? 'cinema-video-area--mobile' : ''
            } ${isVertical && isMobileLayout ? 'cinema-video-area--mobile-vertical' : ''}`}
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
                <YouTubePlayer
                  ref={playerRef}
                  videoId={ytId}
                  title={ex.name}
                  autoplay
                  mute={false}
                  controls
                  preferMaxQuality
                  isShort={isShort}
                  largeSurface
                  onEnded={onVideoEnded}
                />
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
              <AnimatePresence>
                {!isMobileLayout && controlsVisible && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="cinema-fullscreen-btn liquid-glass-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      playerRef.current?.requestFullscreen();
                      resetHideTimer();
                    }}
                    aria-label="Tela cheia"
                    title="Tela cheia (F)"
                  >
                    <Icon name="maximize" className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>

              {hasNav && (
                <div
                  className={`cinema-playlist-nav ${
                    controlsVisible ? '' : 'cinema-playlist-nav--idle'
                  }`}
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
              className={`cinema-lightbox-sidebar relative flex flex-col w-full md:w-[min(360px,32vw)] shrink-0 self-stretch p-5 md:p-6 min-h-full overflow-y-auto no-scrollbar ${
                isMobileLayout ? 'cinema-lightbox-sidebar--mobile' : ''
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
                <div className="flex flex-col min-h-full pb-10">
                  <div className="space-y-4 flex-1 min-h-0">
                    <p className="compare-panel-label compare-panel-label--mode">
                      Modo comparador
                    </p>
                    <ExerciseDetails
                    ex={ex}
                    isCopied={isCopied}
                    onCopy={() => copyLink(ex.youtubeUrl, ex.firestoreId)}
                    onClose={onClose}
                    onDownload={(q) => onDownload(ex, q)}
                    onDownloadUnavailable={
                      onDownloadUnavailable
                        ? (quality) => onDownloadUnavailable(ex, quality)
                        : undefined
                    }
                    compact
                    isAdmin={isAdmin}
                  />
                  <div className="lightbox-divider pt-4">
                    <ExerciseDetails
                      ex={compareEx}
                      isCopied={copiedId === compareEx.firestoreId}
                      onCopy={() => copyLink(compareEx.youtubeUrl, compareEx.firestoreId)}
                      onClose={onClose}
                      onDownload={(q) => onDownload(compareEx, q)}
                      onDownloadUnavailable={
                        onDownloadUnavailable
                          ? (quality) => onDownloadUnavailable(compareEx, quality)
                          : undefined
                      }
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
                    onDownload={(quality) => onDownload(ex, quality)}
                    onDownloadUnavailable={
                      onDownloadUnavailable
                        ? (quality) => onDownloadUnavailable(ex, quality)
                        : undefined
                    }
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
                        <kbd>F</kbd> tela cheia · <kbd>Esc</kbd> fechar
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
  );
}
