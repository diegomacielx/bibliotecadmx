import { useEffect, useMemo, useState, useRef, useCallback, useLayoutEffect, type CSSProperties, type MouseEvent, type PointerEvent, type WheelEvent } from 'react';
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
import { primeVideoPlaybackIntent, primeYouTubePlayerApi } from '../lib/videoPlaybackPrime';
import { lockAppUrl } from '../lib/mobileSessionGuard';
import {
  isMobileAudioUnlocked,
  shouldAutoplayWithSound,
  signalMobilePlaybackGesture,
  unlockMobileAudio,
} from '../lib/mobilePlaybackSession';
import {
  reelsAdjacentSeekSeconds,
  reelsEntrySeekSeconds,
  reelsMarkBackwardLeave,
  reelsMarkForwardLeave,
  reelsSavePosition,
} from '../lib/reelsPlaybackMemory';
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
  copyExerciseName: (name: string, firestoreId: string) => void;
  copiedId: string | null;
  copiedNameId: string | null;
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
  videoAutoplay?: boolean;
  compareLoopSync?: boolean;
  /** Exercício aberto pelo destaque do dia — único caso com opção de som */
  spotlightExerciseId?: string | null;
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
  onCopyName,
  nameCopied = false,
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
  onCopyName?: () => void;
  nameCopied?: boolean;
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
          {onCopyName ? (
            <button
              type="button"
              id={compact ? undefined : 'cinema-lightbox-title'}
              onClick={onCopyName}
              className={`lightbox-title lightbox-title--copyable ${
                compact ? 'lightbox-title--compact lightbox-title--wrap' : ''
              }${nameCopied ? ' lightbox-title--copied' : ''}`}
              title={nameCopied ? 'Nome copiado' : 'Clique para copiar o nome'}
            >
              {ex.name}
            </button>
          ) : (
            <h2
              id={compact ? undefined : 'cinema-lightbox-title'}
              className={`lightbox-title ${compact ? 'lightbox-title--compact lightbox-title--wrap' : ''}`}
            >
              {ex.name}
            </h2>
          )}
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

type ReelsSlideRole = 'prev' | 'current' | 'next';

/** Pausar via mute+seek — nunca pauseVideo() no reels (ícone central do YouTube). */
function settleReelsSlideFrame(player: YouTubePlayerHandle, seekAt: number): void {
  try {
    player.mute();
    const t = player.getCurrentTime();
    if (Math.abs(t - seekAt) > 0.3) player.seekTo(seekAt);
  } catch {
    /* ignore */
  }
}

function MobileCoverPlayer({
  ex,
  ytId,
  hero = false,
  preview = false,
  reelsRole,
  feedScrollActive = false,
  isPlaybackLeader = false,
  isHandoffTarget = false,
  entrySeekAt = 0,
  allowSoundControl = false,
  videoLoop = false,
  videoAutoplay = true,
  onVideoEnded,
  registerActivePlayer,
  registerSlidePlayer,
}: {
  ex: Exercise;
  ytId: string;
  hero?: boolean;
  preview?: boolean;
  reelsRole?: ReelsSlideRole;
  feedScrollActive?: boolean;
  isPlaybackLeader?: boolean;
  /** Slide being promoted to current after snap — never pause/seek during handoff */
  isHandoffTarget?: boolean;
  entrySeekAt?: number;
  allowSoundControl?: boolean;
  videoLoop?: boolean;
  videoAutoplay?: boolean;
  onVideoEnded?: () => void;
  registerActivePlayer?: (player: YouTubePlayerHandle | null) => void;
  registerSlidePlayer?: (player: YouTubePlayerHandle | null) => void;
}) {
  const touchLayout = useTouchLayout();
  const inReelsFeed = reelsRole != null;
  const [isPlaying, setIsPlaying] = useState(inReelsFeed ? true : hero && !preview);
  const [frameReady, setFrameReady] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(
    () => allowSoundControl && isMobileAudioUnlocked()
  );
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const reelsRoleRef = useRef(reelsRole);
  const wasLeaderRef = useRef(isPlaybackLeader);
  const bufferPrimedRef = useRef(false);
  const feedScrollActiveRef = useRef(feedScrollActive);
  const isPlaybackLeaderRef = useRef(isPlaybackLeader);
  const isHandoffTargetRef = useRef(isHandoffTarget);
  const entrySeekAppliedRef = useRef(false);
  const videoLoopRef = useRef(videoLoop);
  const videoAutoplayRef = useRef(videoAutoplay);
  const onVideoEndedRef = useRef(onVideoEnded);
  const { imgSrc, coverMissing, handleLoad, handleError } = useExerciseCover(ex, { priority: 'high' });
  const isVertical =
    resolveVideoOrientation(ex.youtubeUrl, {
      videoOrientation: ex.videoOrientation,
      aspectRatio: ex.aspectRatio,
    }) === 'vertical';

  const trySpotlightSound = allowSoundControl && shouldAutoplayWithSound();
  const shouldMute =
    touchLayout &&
    (inReelsFeed
      ? !(isPlaybackLeader && allowSoundControl && trySpotlightSound)
      : !(allowSoundControl && trySpotlightSound));

  const seekForRole = useCallback(() => {
    if (!reelsRole) return 0;
    if (reelsRole === 'current') return entrySeekAt;
    if (reelsRole === 'next') return 0;
    return reelsAdjacentSeekSeconds(ex.firestoreId, 'prev');
  }, [reelsRole, entrySeekAt, ex.firestoreId]);

  const syncActiveRegistration = useCallback(() => {
    if (!registerActivePlayer || !hero || preview) return;
    if (inReelsFeed) {
      registerActivePlayer(isPlaybackLeader ? playerRef.current : null);
      return;
    }
    registerActivePlayer(playerRef.current);
  }, [registerActivePlayer, hero, preview, inReelsFeed, isPlaybackLeader]);

  const applyReelsPlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player || !inReelsFeed || !reelsRole) return;

    const state = player.getPlayerState();
    const isPlaying = state === 1 || state === 3;

    // The current slide must play continuously. We NEVER pause it nor rewind it
    // here — the one-time entry seek (backward resume) is done in the
    // role-transition effect. This is what makes the handoff seamless: when a
    // previewing 'next'/'prev' slide becomes 'current', it just keeps playing
    // from wherever it already was instead of resetting to the first frame.
    if (reelsRole === 'current') {
      if (videoAutoplayRef.current && !isPlaying) player.playVideo();
      if (isPlaybackLeader) syncActiveRegistration();
      return;
    }

    // Adjacent slides: keep the preview running while the finger scrolls or
    // during the snap handoff.
    if (feedScrollActive || isHandoffTarget) {
      if (!isPlaying) player.playVideo();
      return;
    }

    // Idle adjacent slide: manter frame via mute+seek — sem pauseVideo (overlay do YouTube).
    const seekAt = seekForRole();
    if (bufferPrimedRef.current) {
      const snapping =
        document.documentElement.hasAttribute('data-reels-feed-snapping') ||
        document.documentElement.hasAttribute('data-reels-feed-scrolling');
      if (!snapping) settleReelsSlideFrame(player, seekAt);
      return;
    }
    player.seekTo(seekAt);
    player.playVideo();
  }, [
    inReelsFeed,
    reelsRole,
    feedScrollActive,
    isHandoffTarget,
    isPlaybackLeader,
    seekForRole,
    syncActiveRegistration,
  ]);

  useEffect(() => {
    bufferPrimedRef.current = false;
    setFrameReady(false);
  }, [ex.firestoreId, ytId]);

  useLayoutEffect(() => {
    feedScrollActiveRef.current = feedScrollActive;
    isPlaybackLeaderRef.current = isPlaybackLeader;
    isHandoffTargetRef.current = isHandoffTarget;
    videoLoopRef.current = videoLoop;
    videoAutoplayRef.current = videoAutoplay;
    onVideoEndedRef.current = onVideoEnded;
  }, [feedScrollActive, isPlaybackLeader, isHandoffTarget, videoLoop, videoAutoplay, onVideoEnded]);

  useEffect(() => {
    if (!inReelsFeed) {
      setIsPlaying(hero && !preview);
    }
    setAudioUnlocked(allowSoundControl && isMobileAudioUnlocked());
  }, [ex.firestoreId, hero, preview, allowSoundControl, inReelsFeed]);

  useEffect(() => {
    applyReelsPlayback();
  }, [applyReelsPlayback]);

  useEffect(() => {
    if (inReelsFeed && wasLeaderRef.current && !isPlaybackLeader && playerRef.current) {
      reelsSavePosition(ex.firestoreId, playerRef.current.getCurrentTime());
    }
    wasLeaderRef.current = isPlaybackLeader;
  }, [isPlaybackLeader, inReelsFeed, ex.firestoreId]);

  useEffect(() => {
    const prevRole = reelsRoleRef.current;
    if (inReelsFeed && prevRole === 'current' && reelsRole !== 'current' && playerRef.current) {
      reelsSavePosition(ex.firestoreId, playerRef.current.getCurrentTime());
    }
    if (
      inReelsFeed &&
      prevRole != null &&
      prevRole !== 'current' &&
      reelsRole === 'current' &&
      playerRef.current
    ) {
      const player = playerRef.current;
      // Backward resume only: seek once to the saved spot. On forward nav
      // entrySeekAt is 0, so we leave the video where the preview left it and it
      // simply continues — no rewind to the first frame.
      if (!entrySeekAppliedRef.current && entrySeekAt > 0.2) {
        entrySeekAppliedRef.current = true;
        player.seekTo(entrySeekAt);
      }
      const state = player.getPlayerState();
      if (state !== 1 && state !== 3) player.playVideo();
    }
    if (reelsRole !== 'current') entrySeekAppliedRef.current = false;
    reelsRoleRef.current = reelsRole;
  }, [reelsRole, inReelsFeed, ex.firestoreId, entrySeekAt]);

  useEffect(() => {
    if (!touchLayout || !inReelsFeed || !playerRef.current) return;
    if (shouldMute) playerRef.current.mute();
    else playerRef.current.unMute();
  }, [shouldMute, touchLayout, inReelsFeed, allowSoundControl]);

  useEffect(() => {
    if (!hero || preview || (inReelsFeed && !isPlaybackLeader)) {
      registerActivePlayer?.(null);
      return;
    }
    return () => registerActivePlayer?.(null);
  }, [ex.firestoreId, hero, preview, inReelsFeed, isPlaybackLeader, registerActivePlayer]);

  useEffect(() => {
    if (!preview) primeVideoPlaybackIntent(ex, { force: touchLayout || inReelsFeed });
  }, [ex, preview, touchLayout, inReelsFeed]);

  const handlePlay = () => {
    signalMobilePlaybackGesture();
    primeVideoPlaybackIntent(ex, { force: true });
    setIsPlaying(true);
  };

  const handlePlayerState = useCallback(
    (state: number) => {
      if (!inReelsFeed) return;
      if (state === 0 && reelsRoleRef.current === 'current') {
        if (videoLoopRef.current) {
          queueMicrotask(() => {
            playerRef.current?.seekTo(0);
            playerRef.current?.playVideo();
          });
          return;
        }
        onVideoEndedRef.current?.();
        return;
      }
      if (state !== 2) return;
      const role = reelsRoleRef.current;
      if (role === 'current') {
        queueMicrotask(() => playerRef.current?.playVideo());
        return;
      }
      const scrolling =
        feedScrollActiveRef.current ||
        document.documentElement.hasAttribute('data-reels-feed-scrolling') ||
        document.documentElement.hasAttribute('data-reels-feed-snapping');
      if (role != null && (scrolling || isHandoffTargetRef.current)) {
        queueMicrotask(() => playerRef.current?.playVideo());
      }
    },
    [inReelsFeed]
  );

  const handleVideoEnded = useCallback(() => {
    if (videoLoopRef.current) {
      playerRef.current?.seekTo(0);
      playerRef.current?.playVideo();
      return;
    }
    onVideoEndedRef.current?.();
  }, []);

  const handlePlayerReady = () => {
    const player = playerRef.current;
    if (inReelsFeed) {
      registerSlidePlayer?.(player);
      applyReelsPlayback();
      if (allowSoundControl && isMobileAudioUnlocked()) {
        player?.unMute();
        setAudioUnlocked(true);
      }
      return;
    }

    if (videoAutoplayRef.current) {
      player?.playVideo();
    }
    if (allowSoundControl && isMobileAudioUnlocked()) {
      player?.unMute();
      setAudioUnlocked(true);
    }
    if (hero && !preview) registerActivePlayer?.(player);
  };

  useEffect(() => {
    return () => registerSlidePlayer?.(null);
  }, [registerSlidePlayer]);

  const handleTap = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const player = playerRef.current;
    if (!player) return;

    if (allowSoundControl && !audioUnlocked) {
      unlockMobileAudio();
      setAudioUnlocked(true);
      player.unMute();
      player.playVideo();
      return;
    }

    player.togglePlay();
  };

  const showPlayerLayer = inReelsFeed || isPlaying;
  const reelsVideoAspect = isVertical ? '9 / 16' : '16 / 9';

  return (
    <div
      className={`cinema-mobile-cover-frame ${hero ? 'cinema-mobile-cover-frame--hero' : ''} ${
        showPlayerLayer ? 'cinema-mobile-cover-frame--playing' : ''
      }`}
      style={inReelsFeed ? ({ '--reels-video-aspect': reelsVideoAspect } as CSSProperties) : undefined}
    >
      {showPlayerLayer ? (
        <div
          className={`cinema-mobile-cover-player cinema-player-layer ${
            hero ? 'cinema-mobile-cover-player--reels-cover' : ''
          } ${
            hero && isVertical ? 'cinema-mobile-cover-player--vertical-theater cinema-player-layer--vertical-theater' : ''
          }${inReelsFeed && !frameReady && !feedScrollActive ? ' cinema-mobile-cover-player--awaiting-frame' : ''}`}
        >
          <YouTubePlayer
            ref={playerRef}
            videoId={ytId}
            title={ex.name}
            autoplay
            mute={shouldMute}
            controls={false}
            largeSurface
            mobileVertical={isVertical}
            onReady={handlePlayerReady}
            onPlayerState={inReelsFeed ? handlePlayerState : undefined}
            onEnded={inReelsFeed ? undefined : handleVideoEnded}
            onFrameVisible={() => {
              setFrameReady(true);
              const isAdjacent = reelsRoleRef.current != null && reelsRoleRef.current !== 'current';
              if (
                inReelsFeed &&
                isAdjacent &&
                !isPlaybackLeaderRef.current &&
                !feedScrollActiveRef.current &&
                !isHandoffTargetRef.current
              ) {
                bufferPrimedRef.current = true;
                const seekAt = seekForRole();
                if (playerRef.current) settleReelsSlideFrame(playerRef.current, seekAt);
              }
            }}
          />
          {inReelsFeed && !frameReady && !feedScrollActive && (
            coverMissing ? (
              <ExerciseCoverPlaceholder className="cinema-mobile-cover-poster cinema-mobile-cover-poster--reels-mask" />
            ) : (
              <img
                src={imgSrc}
                alt=""
                role="presentation"
                loading="eager"
                decoding="async"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="cinema-mobile-cover-poster cinema-mobile-cover-poster--reels-mask"
                style={{
                  objectPosition: getCoverFrameStyle(ex).objectPosition,
                  ...(getCoverFrameStyle(ex).cssVars as React.CSSProperties),
                }}
              />
            )
          )}
          {allowSoundControl && !audioUnlocked && (
            <div className="mobile-reels-unmute-hint" aria-hidden="true">
              <Icon name="volume" className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Toque para o som</span>
            </div>
          )}
          {!inReelsFeed && (
            <button
              type="button"
              className="cinema-play-catch cinema-mobile-play-catch absolute inset-0 z-[2]"
              aria-label={
                allowSoundControl && !audioUnlocked ? 'Ativar som e reproduzir' : 'Reproduzir ou pausar'
              }
              onClick={handleTap}
            />
          )}
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

interface ReelsSlide {
  ex: Exercise;
  kind: ReelsSlideRole;
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
  registerActivePlayer,
  spotlightExerciseId,
  onVisibleExerciseChange,
  videoLoop = false,
  videoAutoplay = true,
  onVideoEnded,
}: {
  navList: Exercise[];
  navIndex: number;
  onNavPrev: () => void;
  onNavNext: () => void;
  navPrevDisabled: boolean;
  navNextDisabled: boolean;
  registerActivePlayer?: (player: YouTubePlayerHandle | null) => void;
  spotlightExerciseId?: string | null;
  onVisibleExerciseChange?: (exercise: Exercise) => void;
  videoLoop?: boolean;
  videoAutoplay?: boolean;
  onVideoEnded?: () => void;
}) {
  const videoAutoplayRef = useRef(videoAutoplay);
  useEffect(() => {
    videoAutoplayRef.current = videoAutoplay;
  }, [videoAutoplay]);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);
  const slidePlayersRef = useRef<Map<string, YouTubePlayerHandle>>(new Map());
  const leaderPlayerRef = useRef<YouTubePlayerHandle | null>(null);
  const dragOffsetRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchLastRef = useRef({ y: 0, t: 0 });
  const touchVelRef = useRef(0);
  const totalMovementRef = useRef(0);
  const activePointerIdRef = useRef<number | null>(null);
  const pendingNavRef = useRef<'next' | 'prev' | null>(null);
  const snappingBackRef = useRef(false);
  const snapTimerRef = useRef(0);
  const navSettleTimerRef = useRef(0);
  const scrollGestureRef = useRef(false);
  const gestureActiveRef = useRef(false);
  const gestureApiRef = useRef({
    slideHeight: 0,
    hasPrev: false,
    hasNext: false,
    setDrag: (_n: number) => {},
    settleGesture: () => {},
    endGesture: () => {},
    setFeedScrolling: (_a: boolean) => {},
    commitAnimated: (_d: 'next' | 'prev') => {},
    snapBackAnimated: () => {},
    handleFeedNavNext: () => {},
    handleFeedNavPrev: () => {},
    syncVisibleExercise: (_k: ReelsSlideRole) => {},
    setPlaybackKind: (_k: ReelsSlideRole) => {},
    setGestureActive: (_a: boolean) => {},
    setIsSnapping: (_a: boolean) => {},
    ensureSlidePlaying: (_k: ReelsSlideRole) => {},
    primeAdjacentSlides: () => {},
    forceCompleteSnap: () => {},
    setDragOffset: (_n: number) => {},
  });
  const [slideHeight, setSlideHeight] = useState(0);
  const [entrySeekAt, setEntrySeekAt] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [gestureActive, setGestureActive] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [playbackKind, setPlaybackKind] = useState<ReelsSlideRole>('current');
  const [handoffExerciseId, setHandoffExerciseId] = useState<string | null>(null);

  const slides = useMemo(() => buildReelsSlides(navList, navIndex), [navList, navIndex]);

  const currentSlideIndex = useMemo(
    () => slides.findIndex((s) => s.kind === 'current'),
    [slides]
  );

  const hasPrev = !navPrevDisabled;
  const hasNext = !navNextDisabled;

  const exerciseForKind = useCallback(
    (kind: ReelsSlideRole) => slides.find((slide) => slide.kind === kind)?.ex ?? null,
    [slides]
  );

  const syncVisibleExercise = useCallback(
    (kind: ReelsSlideRole) => {
      const visible = exerciseForKind(kind);
      if (visible) onVisibleExerciseChange?.(visible);
    },
    [exerciseForKind, onVisibleExerciseChange]
  );

  const registerSlidePlayer = useCallback(
    (exerciseId: string, player: YouTubePlayerHandle | null) => {
      if (player) {
        slidePlayersRef.current.set(exerciseId, player);
        const slide = slides.find((s) => s.ex.firestoreId === exerciseId);
        if (slide && slide.kind !== 'current') {
          const seekAt =
            slide.kind === 'next' ? 0 : reelsAdjacentSeekSeconds(exerciseId, 'prev');
          try {
            player.seekTo(seekAt);
            player.playVideo();
          } catch {
            /* player not ready */
          }
        }
      } else {
        slidePlayersRef.current.delete(exerciseId);
      }
    },
    [slides]
  );

  const primeAdjacentSlides = useCallback(() => {
    for (const slide of slides) {
      if (slide.kind === 'current') continue;
      const player = slidePlayersRef.current.get(slide.ex.firestoreId);
      if (!player) continue;
      const state = player.getPlayerState();
      if (state === 1 || state === 3) continue;
      const seekAt =
        slide.kind === 'next' ? 0 : reelsAdjacentSeekSeconds(slide.ex.firestoreId, 'prev');
      try {
        player.seekTo(seekAt);
        player.playVideo();
      } catch {
        /* ignore */
      }
    }
  }, [slides]);

  const registerCurrentPlayer = useCallback(
    (player: YouTubePlayerHandle | null) => {
      leaderPlayerRef.current = player;
      registerActivePlayer?.(player);
    },
    [registerActivePlayer]
  );

  const readLeavingTime = useCallback(
    (exerciseId: string) => slidePlayersRef.current.get(exerciseId)?.getCurrentTime() ?? 0,
    []
  );

  const handleFeedNavNext = useCallback(() => {
    const leaving = navList[navIndex];
    if (leaving) {
      reelsMarkForwardLeave(
        leaving.firestoreId,
        readLeavingTime(leaving.firestoreId),
        navIndex > 0 ? navList[navIndex - 1].firestoreId : null
      );
    }
    const entering = navList[navIndex + 1];
    if (entering) setEntrySeekAt(reelsEntrySeekSeconds(entering.firestoreId, 'next'));
    onNavNext();
  }, [navList, navIndex, onNavNext, readLeavingTime]);

  const handleFeedNavPrev = useCallback(() => {
    const leaving = navList[navIndex];
    if (leaving) {
      reelsMarkBackwardLeave(leaving.firestoreId, readLeavingTime(leaving.firestoreId));
    }
    const entering = navList[navIndex - 1];
    if (entering) setEntrySeekAt(reelsEntrySeekSeconds(entering.firestoreId, 'prev'));
    onNavPrev();
  }, [navList, navIndex, onNavPrev, readLeavingTime]);

  const clampDragOffset = useCallback(
    (raw: number) => {
      const h = slideHeight;
      if (h <= 0) return 0;

      const maxPull = hasNext ? h * 1.08 : h * 0.28;
      const minPull = hasPrev ? -h * 1.08 : -h * 0.28;

      if (raw > maxPull) return maxPull + (raw - maxPull) * 0.22;
      if (raw < minPull) return minPull + (raw - minPull) * 0.22;
      return raw;
    },
    [slideHeight, hasNext, hasPrev]
  );

  const setDrag = useCallback(
    (next: number) => {
      const clamped = clampDragOffset(next);
      dragOffsetRef.current = clamped;
      setDragOffset(clamped);
    },
    [clampDragOffset]
  );

  const resetDrag = useCallback(() => {
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setPlaybackKind('current');
    syncVisibleExercise('current');
  }, [syncVisibleExercise]);

  const syncSlideHeight = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = el.clientHeight;
    if (h > 0) setSlideHeight(h);
  }, []);

  useLayoutEffect(() => {
    syncSlideHeight();
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => syncSlideHeight());
    ro.observe(el);
    return () => ro.disconnect();
  }, [syncSlideHeight]);

  const setFeedScrolling = useCallback((active: boolean) => {
    if (typeof document === 'undefined') return;
    if (active) {
      document.documentElement.setAttribute('data-reels-feed-scrolling', 'true');
    } else {
      document.documentElement.removeAttribute('data-reels-feed-scrolling');
    }
  }, []);

  const endGesture = useCallback(() => {
    gestureActiveRef.current = false;
    setGestureActive(false);
    setFeedScrolling(false);
  }, [setFeedScrolling]);

  const ensureSlidePlaying = useCallback(
    (kind: ReelsSlideRole) => {
      const ex = exerciseForKind(kind);
      if (!ex) return;
      const player = slidePlayersRef.current.get(ex.firestoreId);
      if (!player) return;
      const state = player.getPlayerState();
      if (state === 1 || state === 3) return;
      if (state === 2 && player.getCurrentTime() > 0.2) {
        player.playVideo();
        return;
      }
      player.playVideo();
    },
    [exerciseForKind]
  );

  const finishSnapAnimation = useCallback(() => {
    window.clearTimeout(snapTimerRef.current);

    const pending = pendingNavRef.current;
    const snappingBack = snappingBackRef.current;
    if (!pending && !snappingBack) return;

    if (pending === 'next') {
      pendingNavRef.current = null;
      snappingBackRef.current = false;
      // Ensure the winning slide is still playing before the React nav update.
      ensureSlidePlaying('next');
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setIsSnapping(false);
      // Promote the leader immediately so the new current is never treated as a
      // paused adjacent slide between the nav update and the layout effect.
      setPlaybackKind('current');
      handleFeedNavNext();
      endGesture();
      return;
    }

    if (pending === 'prev') {
      pendingNavRef.current = null;
      snappingBackRef.current = false;
      ensureSlidePlaying('prev');
      dragOffsetRef.current = 0;
      setDragOffset(0);
      setIsSnapping(false);
      setPlaybackKind('current');
      handleFeedNavPrev();
      endGesture();
      return;
    }

    if (snappingBackRef.current) {
      snappingBackRef.current = false;
      ensureSlidePlaying('current');
      setIsSnapping(false);
      setPlaybackKind('current');
      endGesture();
    }
  }, [handleFeedNavNext, handleFeedNavPrev, ensureSlidePlaying, endGesture]);

  const scheduleSnapFallback = useCallback(() => {
    window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = window.setTimeout(() => finishSnapAnimation(), 260);
  }, [finishSnapAnimation]);

  const forceCompleteSnap = useCallback(() => {
    window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = 0;
    if (pendingNavRef.current || snappingBackRef.current) {
      finishSnapAnimation();
      return;
    }
    setIsSnapping(false);
    dragOffsetRef.current = 0;
    setDragOffset(0);
  }, [finishSnapAnimation]);

  const commitAnimated = useCallback(
    (direction: 'next' | 'prev') => {
      const h = slideHeight;
      if (h <= 0) return;

      pendingNavRef.current = direction;
      snappingBackRef.current = false;
      const handoffEx = exerciseForKind(direction);
      if (handoffEx) setHandoffExerciseId(handoffEx.firestoreId);
      setIsSnapping(true);
      setFeedScrolling(true);
      setPlaybackKind(direction);
      ensureSlidePlaying(direction);

      const target = direction === 'next' ? h : -h;
      dragOffsetRef.current = target;
      setDragOffset(target);
      syncVisibleExercise(direction);
      scheduleSnapFallback();
    },
    [slideHeight, setFeedScrolling, ensureSlidePlaying, syncVisibleExercise, scheduleSnapFallback, exerciseForKind]
  );

  const snapBackAnimated = useCallback(() => {
    pendingNavRef.current = null;
    snappingBackRef.current = true;
    setIsSnapping(true);
    setFeedScrolling(true);
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setPlaybackKind('current');
    syncVisibleExercise('current');
    ensureSlidePlaying('current');
    scheduleSnapFallback();
  }, [setFeedScrolling, syncVisibleExercise, ensureSlidePlaying, scheduleSnapFallback]);

  const settleGesture = useCallback(() => {
    const h = gestureApiRef.current.slideHeight;
    if (h <= 0) {
      snapBackAnimated();
      return;
    }

    const offset = dragOffsetRef.current;
    const vel = touchVelRef.current;
    const ratio = offset / h;

    let commitNext = ratio >= 0.5;
    let commitPrev = ratio <= -0.5;

    if (!commitNext && !commitPrev) {
      if (vel > 0.28 && ratio > 0.08) commitNext = true;
      else if (vel < -0.28 && ratio < -0.08) commitPrev = true;
    }

    if (!commitNext && !commitPrev) {
      if (vel > 0.55 && ratio > 0.03) commitNext = true;
      else if (vel < -0.55 && ratio < -0.03) commitPrev = true;
    }

    if (commitNext && gestureApiRef.current.hasNext) {
      gestureApiRef.current.ensureSlidePlaying('next');
      gestureApiRef.current.commitAnimated('next');
      return;
    }
    if (commitPrev && gestureApiRef.current.hasPrev) {
      gestureApiRef.current.ensureSlidePlaying('prev');
      gestureApiRef.current.commitAnimated('prev');
      return;
    }

    snapBackAnimated();
  }, [snapBackAnimated]);

  useLayoutEffect(() => {
    if (isSnapping) {
      document.documentElement.setAttribute('data-reels-feed-snapping', 'true');
    } else {
      document.documentElement.removeAttribute('data-reels-feed-snapping');
    }
  }, [isSnapping]);

  useLayoutEffect(() => {
    gestureApiRef.current = {
      slideHeight,
      hasPrev,
      hasNext,
      setDrag,
      settleGesture,
      endGesture,
      setFeedScrolling,
      commitAnimated,
      snapBackAnimated,
      handleFeedNavNext,
      handleFeedNavPrev,
      syncVisibleExercise,
      setPlaybackKind,
      setGestureActive,
      setIsSnapping,
      setDragOffset,
      ensureSlidePlaying,
      primeAdjacentSlides,
      forceCompleteSnap,
    };
  });

  useLayoutEffect(() => {
    if (!gestureActiveRef.current) {
      resetDrag();
      endGesture();
    }
    setPlaybackKind('current');
    pendingNavRef.current = null;
    snappingBackRef.current = false;
    setIsSnapping(false);

    window.clearTimeout(navSettleTimerRef.current);
    navSettleTimerRef.current = window.setTimeout(() => {
      primeAdjacentSlides();
      const currentEx = navList[navIndex];
      if (currentEx) {
        const player = slidePlayersRef.current.get(currentEx.firestoreId);
        if (player) {
          const state = player.getPlayerState();
          if (state !== 1 && state !== 3) player.playVideo();
        }
      }
      setHandoffExerciseId(null);
    }, 48);

    return () => window.clearTimeout(navSettleTimerRef.current);
  }, [navIndex, resetDrag, endGesture, primeAdjacentSlides, navList]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== track || e.propertyName !== 'transform') return;
      finishSnapAnimation();
    };

    track.addEventListener('transitionend', onTransitionEnd);
    return () => track.removeEventListener('transitionend', onTransitionEnd);
  }, [finishSnapAnimation]);

  useEffect(() => {
    primeYouTubePlayerApi();
    const prev = navIndex > 0 ? navList[navIndex - 1] : null;
    const next = navIndex < navList.length - 1 ? navList[navIndex + 1] : null;
    if (prev) primeVideoPlaybackIntent(prev, { force: true });
    if (next) primeVideoPlaybackIntent(next, { force: true });
  }, [navIndex, navList]);

  useEffect(() => {
    lockAppUrl();
    const onRestore = () => {
      lockAppUrl();
      const currentEx = navList[navIndex];
      const player = currentEx ? slidePlayersRef.current.get(currentEx.firestoreId) : null;
      if (!player) return;
      try {
        const state = player.getPlayerState();
        if (state !== 1 && state !== 3) player.playVideo();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('dmx:bfcache-restore', onRestore);
    return () => window.removeEventListener('dmx:bfcache-restore', onRestore);
  }, [navIndex, navList]);

  // Silencia players quando a aba sai de foco — sem pauseVideo (evita overlay do YouTube).
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        for (const player of slidePlayersRef.current.values()) {
          try {
            player.mute();
          } catch { /* ignore */ }
        }
        return;
      }
      const currentEx = navList[navIndex];
      const player = currentEx ? slidePlayersRef.current.get(currentEx.firestoreId) : null;
      if (player) {
        try {
          const state = player.getPlayerState();
          if (state !== 1 && state !== 3) player.playVideo();
        } catch { /* ignore */ }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [navIndex, navList]);

  useEffect(() => {
    const layer = gestureRef.current;
    if (!layer) return;

    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (pendingNavRef.current || snappingBackRef.current) {
        gestureApiRef.current.forceCompleteSnap();
      }

      touchStartYRef.current = e.clientY;
      dragStartOffsetRef.current = dragOffsetRef.current;
      touchLastRef.current = { y: e.clientY, t: performance.now() };
      touchVelRef.current = 0;
      totalMovementRef.current = 0;
      scrollGestureRef.current = false;
      activePointerIdRef.current = e.pointerId;
      gestureActiveRef.current = true;

      gestureApiRef.current.setGestureActive(true);
      gestureApiRef.current.setFeedScrolling(true);
      gestureApiRef.current.setIsSnapping(false);
      primeYouTubePlayerApi();
      signalMobilePlaybackGesture();
      gestureApiRef.current.primeAdjacentSlides();

      // Start all slide players within the gesture (iOS requires user-gesture
      // context for programmatic playVideo even when muted).
      if (videoAutoplayRef.current) {
        for (const player of slidePlayersRef.current.values()) {
          try {
            const state = player.getPlayerState();
            if (state !== 1 && state !== 3) player.playVideo();
          } catch { /* ignore */ }
        }
      }

      layer.setPointerCapture(e.pointerId);
    };

    const releaseCapture = (pointerId: number) => {
      try {
        layer.releasePointerCapture(pointerId);
      } catch {
        /* already released */
      }
      activePointerIdRef.current = null;
    };

    const onPointerMove = (e: globalThis.PointerEvent) => {
      if (!gestureActiveRef.current) return;

      const now = performance.now();
      const dt = now - touchLastRef.current.t;
      if (dt > 0) touchVelRef.current = (touchLastRef.current.y - e.clientY) / dt;
      touchLastRef.current = { y: e.clientY, t: now };

      const dy = touchStartYRef.current - e.clientY;
      totalMovementRef.current = Math.max(totalMovementRef.current, Math.abs(dy));
      if (totalMovementRef.current >= 12) scrollGestureRef.current = true;
      gestureApiRef.current.setDrag(dragStartOffsetRef.current + dy);
    };

    const finishPointer = () => {
      if (activePointerIdRef.current != null) releaseCapture(activePointerIdRef.current);

      if (!gestureActiveRef.current) return;

      if (totalMovementRef.current < 12) {
        gestureActiveRef.current = false;
        gestureApiRef.current.setGestureActive(false);
        gestureApiRef.current.setFeedScrolling(false);
        return;
      }

      signalMobilePlaybackGesture();
      gestureActiveRef.current = false;
      gestureApiRef.current.setGestureActive(false);
      gestureApiRef.current.settleGesture();
    };

    layer.addEventListener('pointerdown', onPointerDown);
    layer.addEventListener('pointermove', onPointerMove);
    layer.addEventListener('pointerup', finishPointer);
    layer.addEventListener('pointercancel', finishPointer);

    return () => {
      layer.removeEventListener('pointerdown', onPointerDown);
      layer.removeEventListener('pointermove', onPointerMove);
      layer.removeEventListener('pointerup', finishPointer);
      layer.removeEventListener('pointercancel', finishPointer);
    };
  }, []);

  const translateY = slideHeight > 0 ? -(currentSlideIndex * slideHeight + dragOffset) : 0;

  const scrollPhaseActive = gestureActive || isSnapping;
  // During finger drag keep the current slide as playback leader; only switch on snap/release.
  const playbackLeaderKind: ReelsSlideRole =
    gestureActive && !isSnapping ? 'current' : playbackKind;

  return (
    <div
      ref={containerRef}
      className={`mobile-reels-feed${scrollPhaseActive ? ' mobile-reels-feed--gesture' : ''}`}
      style={slideHeight > 0 ? ({ '--mobile-reels-slide-h': `${slideHeight}px` } as CSSProperties) : undefined}
      aria-label="Feed de exercícios"
    >
      <div
        ref={trackRef}
        className={`mobile-reels-feed__track${isSnapping ? ' mobile-reels-feed__track--snap' : ''}`}
        style={{ transform: `translate3d(0, ${translateY}px, 0)` }}
      >
        {slides.map((slide) => {
          const slideYtId = getYouTubeId(slide.ex.youtubeUrl);
          const isActive = slide.kind === 'current';
          const isPlaybackLeader = slide.kind === playbackLeaderKind;
          const allowSoundControl =
            isPlaybackLeader && !!spotlightExerciseId && slide.ex.firestoreId === spotlightExerciseId;
          // During any scroll phase, all slides stay active so their players are already
          // playing (and showing a frame) when they cross into view.
          const slideScrollActive = scrollPhaseActive;

          const isHandoffTarget = handoffExerciseId === slide.ex.firestoreId;

          return (
            <div
              key={slide.ex.firestoreId}
              className="mobile-reels-feed__slide"
              data-reels-slide={slide.kind}
            >
              {slideYtId ? (
                <MobileCoverPlayer
                  ex={slide.ex}
                  ytId={slideYtId}
                  hero
                  reelsRole={slide.kind}
                  feedScrollActive={slideScrollActive}
                  isPlaybackLeader={isPlaybackLeader}
                  isHandoffTarget={isHandoffTarget}
                  entrySeekAt={isActive ? entrySeekAt : 0}
                  allowSoundControl={allowSoundControl}
                  videoLoop={videoLoop}
                  videoAutoplay={videoAutoplay}
                  onVideoEnded={onVideoEnded}
                  registerActivePlayer={isPlaybackLeader ? registerCurrentPlayer : undefined}
                  registerSlidePlayer={(player) => registerSlidePlayer(slide.ex.firestoreId, player)}
                />
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
      <div
        ref={gestureRef}
        className="mobile-reels-feed__gesture"
        aria-hidden="true"
      />
    </div>
  );
}

function MobileExerciseSheet({
  ex,
  ytId,
  navList,
  isCopied,
  onCopy,
  copiedNameId,
  copyExerciseName,
  onDownload,
  isFavorite,
  onToggleFavorite,
  hasNav,
  navIndex,
  onNavPrev,
  onNavNext,
  navPrevDisabled,
  navNextDisabled,
  spotlightExerciseId,
  videoLoop = false,
  videoAutoplay = true,
  onVideoEnded,
}: {
  ex: Exercise;
  ytId: string | null;
  navList: Exercise[];
  onClose: () => void;
  isCopied: boolean;
  onCopy: () => void;
  copiedNameId: string | null;
  copyExerciseName: (name: string, firestoreId: string) => void;
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
  spotlightExerciseId?: string | null;
  videoLoop?: boolean;
  videoAutoplay?: boolean;
  onVideoEnded?: () => void;
}) {
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [speedActive, setSpeedActive] = useState(false);
  const [displayEx, setDisplayEx] = useState(ex);
  const activePlayerRef = useRef<YouTubePlayerHandle | null>(null);
  const speedHoldRef = useRef(false);
  const speedTimerRef = useRef(0);
  const useVerticalFeed = hasNav && navList.length > 1;
  const allowSoundControl = spotlightExerciseId === displayEx.firestoreId;
  const videoOrientation = useMemo(
    () =>
      resolveVideoOrientation(displayEx.youtubeUrl, {
        videoOrientation: displayEx.videoOrientation,
        aspectRatio: displayEx.aspectRatio,
      }),
    [displayEx.youtubeUrl, displayEx.videoOrientation, displayEx.aspectRatio]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-reels-video-orientation', videoOrientation);
    return () => document.documentElement.removeAttribute('data-reels-video-orientation');
  }, [videoOrientation]);

  useEffect(() => {
    setDisplayEx(ex);
  }, [ex.firestoreId, ex]);

  const registerActivePlayer = useCallback((player: YouTubePlayerHandle | null) => {
    activePlayerRef.current = player;
  }, []);

  const endSpeedHold = useCallback(() => {
    window.clearTimeout(speedTimerRef.current);
    if (speedHoldRef.current) {
      activePlayerRef.current?.setPlaybackRate(1);
      speedHoldRef.current = false;
      setSpeedActive(false);
    }
  }, []);

  const blockNativeTouchMenu = useCallback((e: { preventDefault: () => void; stopPropagation: () => void }) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleSpeedZoneDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (document.documentElement.hasAttribute('data-reels-feed-scrolling')) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      window.clearTimeout(speedTimerRef.current);
      speedTimerRef.current = window.setTimeout(() => {
        activePlayerRef.current?.setPlaybackRate(2);
        speedHoldRef.current = true;
        setSpeedActive(true);
      }, 260);
    },
    []
  );

  const handleSpeedZoneUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      endSpeedHold();
    },
    [endSpeedHold]
  );

  useEffect(() => {
    setMusclesOpen(false);
    endSpeedHold();
  }, [displayEx.firestoreId, endSpeedHold]);

  useEffect(() => {
    const stage = document.querySelector('.cinema-mobile-reels-stage');
    if (!stage) return;
    const blockMenu = (e: Event) => e.preventDefault();
    stage.addEventListener('contextmenu', blockMenu);
    return () => stage.removeEventListener('contextmenu', blockMenu);
  }, []);

  const stagePlaceholderStyle = getCoverPlaceholderStyle(displayEx.id, displayEx.category);

  return (
    <div
      className="cinema-mobile-sheet cinema-mobile-sheet--reels"
      style={stagePlaceholderStyle}
      onContextMenu={blockNativeTouchMenu}
    >
      <div
        className="cinema-mobile-reels-stage"
        style={stagePlaceholderStyle}
        onContextMenu={blockNativeTouchMenu}
      >
        {useVerticalFeed ? (
          <MobileReelsFeed
            navList={navList}
            navIndex={navIndex}
            onNavPrev={onNavPrev}
            onNavNext={onNavNext}
            navPrevDisabled={navPrevDisabled}
            navNextDisabled={navNextDisabled}
            registerActivePlayer={registerActivePlayer}
            spotlightExerciseId={spotlightExerciseId}
            videoLoop={videoLoop}
            videoAutoplay={videoAutoplay}
            onVideoEnded={onVideoEnded}
            onVisibleExerciseChange={setDisplayEx}
          />
        ) : ytId ? (
          <MobileCoverPlayer
            ex={displayEx}
            ytId={ytId}
            hero
            allowSoundControl={allowSoundControl}
            videoLoop={videoLoop}
            videoAutoplay={videoAutoplay}
            onVideoEnded={onVideoEnded}
            registerActivePlayer={registerActivePlayer}
          />
        ) : (
          <div className="cinema-mobile-cover-frame cinema-mobile-cover-frame--hero cinema-mobile-cover-frame--empty">
            <Icon name="youtube" className="w-10 h-10 text-zinc-500" strokeWidth={1} />
            <p className="text-2xs font-medium uppercase tracking-cinematic-wide text-zinc-500">
              Execução pendente
            </p>
          </div>
        )}

        <div className="mobile-reels-speed-zones" aria-hidden="true">
          <div
            className="mobile-reels-speed-zone mobile-reels-speed-zone--left"
            onPointerDown={handleSpeedZoneDown}
            onPointerUp={handleSpeedZoneUp}
            onPointerCancel={handleSpeedZoneUp}
            onContextMenu={blockNativeTouchMenu}
            onTouchStart={blockNativeTouchMenu}
          />
          <div
            className="mobile-reels-speed-zone mobile-reels-speed-zone--right"
            onPointerDown={handleSpeedZoneDown}
            onPointerUp={handleSpeedZoneUp}
            onPointerCancel={handleSpeedZoneUp}
            onContextMenu={blockNativeTouchMenu}
            onTouchStart={blockNativeTouchMenu}
          />
        </div>

        {speedActive && (
          <div className="mobile-reels-speed-badge" aria-live="polite">
            2×
          </div>
        )}

        <div className="cinema-mobile-reels-top">
          <h1 className="cinema-mobile-reels-title">{displayEx.name}</h1>
        </div>

        {videoOrientation === 'horizontal' && (
          <p className="mobile-reels-rotate-hint">Gire o aparelho para tela cheia</p>
        )}

        <MobileReelsFooterBlur exerciseId={displayEx.id} category={displayEx.category} />

        <div className="cinema-mobile-reels-rail">
          <MobileMusclesDropup
            groups={displayEx.muscleGroups}
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
              copiedNameId === displayEx.firestoreId ? 'cinema-mobile-reels-rail-btn--success' : ''
            }`}
            onClick={() => copyExerciseName(displayEx.name, displayEx.firestoreId)}
            aria-label={
              copiedNameId === displayEx.firestoreId ? 'Nome copiado' : 'Copiar nome do exercício'
            }
            title={copiedNameId === displayEx.firestoreId ? 'Copiado' : 'Copiar nome'}
          >
            <Icon
              name={copiedNameId === displayEx.firestoreId ? 'check' : 'type'}
              className="w-6 h-6"
              strokeWidth={1.75}
            />
          </button>
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
  videoLoop = false,
}: {
  ex: Exercise;
  label: string;
  playerRef: React.RefObject<YouTubePlayerHandle | null>;
  onSyncPlay: () => void;
  onPlayerReady: () => void;
  onEnded?: () => void;
  mobileLayout?: boolean;
  videoLoop?: boolean;
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
            <MobileCoverPlayer
              ex={ex}
              ytId={ytId}
              videoLoop={videoLoop}
              onVideoEnded={onEnded}
              registerActivePlayer={(player) => {
                (playerRef as React.MutableRefObject<YouTubePlayerHandle | null>).current = player;
                if (player) {
                  setReadyToken((t) => t + 1);
                  onPlayerReady();
                }
              }}
            />
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
  copyExerciseName,
  copiedId,
  copiedNameId,
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
  videoAutoplay = true,
  compareLoopSync = false,
  spotlightExerciseId = null,
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
  const videoAutoplayRef = useRef(videoAutoplay);
  const compareLoopSyncRef = useRef(compareLoopSync);

  useEffect(() => {
    videoLoopRef.current = videoLoop;
  }, [videoLoop]);

  useEffect(() => {
    videoAutoplayRef.current = videoAutoplay;
  }, [videoAutoplay]);

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
  const isNameCopied = copiedNameId === ex.firestoreId;
  const desktopTitleCopy =
    !isMobileLayout
      ? {
          onCopyName: () => copyExerciseName(ex.name, ex.firestoreId),
          nameCopied: isNameCopied,
        }
      : {};
  const desktopCompareTitleCopy = (target: Exercise) =>
    !isMobileLayout
      ? {
          onCopyName: () => copyExerciseName(target.name, target.firestoreId),
          nameCopied: copiedNameId === target.firestoreId,
        }
      : {};
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
            copiedNameId={copiedNameId}
            copyExerciseName={copyExerciseName}
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
            spotlightExerciseId={spotlightExerciseId}
            videoLoop={videoLoop}
            videoAutoplay={videoAutoplay}
            onVideoEnded={handlePlayerEnded}
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
              videoLoop={videoLoop}
            />
            <ComparePanel
              ex={compareEx}
              label="Exercício B"
              playerRef={comparePlayerRef}
              onSyncPlay={syncCompare}
              onPlayerReady={handleCompareSecondaryReady}
              onEnded={() => handleComparePlayerEnded('secondary')}
              mobileLayout={isMobileLayout}
              videoLoop={videoLoop}
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
                    {...desktopTitleCopy}
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
                      {...desktopCompareTitleCopy(compareEx)}
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
                    {...desktopTitleCopy}
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
