import { useEffect, useRef, useId, forwardRef, useImperativeHandle } from 'react';
import { logDebug } from '../lib/utils';
import { applyInitialMaxQuality } from '../lib/youtubeQuality';

let apiPromise: Promise<void> | null = null;

export function preloadYouTubePlayerApi(): Promise<void> {
  return loadYouTubeIframeAPI();
}

function loadYouTubeIframeAPI(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    const done = () => resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      done();
    };

    if (document.querySelector('script[data-dmx-yt-api]')) {
      const poll = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(poll);
          done();
        }
      }, 50);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.dataset.dmxYtApi = 'true';
    document.head.appendChild(tag);
  });

  return apiPromise;
}

function forceMaximumQuality(player: YT.Player, label: string) {
  try {
    const available = player.getAvailableQualityLevels?.() ?? [];
    logDebug('YouTubePlayer', `${label} qualidades:`, available);
    applyInitialMaxQuality(player);
  } catch (e) {
    logDebug('YouTubePlayer', 'forceMaximumQuality falhou', e);
  }
}

function startQualityEnforcer(player: YT.Player, isShort: boolean) {
  const delays = isShort
    ? [0, 300, 600, 1000, 1500, 2500, 4000, 6000, 8000, 10000]
    : [0, 400, 800, 1200, 2000, 3500, 5000, 7500, 10000, 14000];
  const timers: ReturnType<typeof setTimeout>[] = [];

  for (const delay of delays) {
    timers.push(
      setTimeout(() => {
        try {
          const state = player.getPlayerState?.();
          if (state === 0 || state === 5) return;
          forceMaximumQuality(player, `enforce@${delay}ms`);
        } catch {
          /* ignore */
        }
      }, delay)
    );
  }

  let ticks = 0;
  const interval = setInterval(() => {
    ticks += 1;
    if (ticks > 8) {
      clearInterval(interval);
      return;
    }
    try {
      const state = player.getPlayerState?.();
      if (state === 1 || state === 3) {
        forceMaximumQuality(player, `interval@${ticks}`);
      }
    } catch {
      /* ignore */
    }
  }, 2000);

  return () => {
    timers.forEach(clearTimeout);
    clearInterval(interval);
  };
}

export interface YouTubePlayerHandle {
  playVideo: () => void;
  pauseVideo: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoLoadedFraction: () => number;
  getPlayerState: () => number;
  requestFullscreen: () => void;
  getAvailableQualityLevels: () => YT.PlaybackQuality[];
  getPlaybackQuality: () => YT.PlaybackQuality;
  setPlaybackQuality: (quality: YT.PlaybackQuality | 'auto') => void;
}

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  className?: string;
  autoplay?: boolean;
  mute?: boolean;
  controls?: boolean;
  loop?: boolean;
  preferMaxQuality?: boolean;
  /** Permite escolher qualidade no menu nativo do YouTube (⋮) sem forçar máxima */
  allowQualitySelection?: boolean;
  isShort?: boolean;
  /** Player grande (lightbox) — YouTube libera qualidades mais altas */
  largeSurface?: boolean;
  onEnded?: () => void;
  onPlayStateChange?: (playing: boolean) => void;
  onReady?: () => void;
  /** Aguarda play externo (ex.: sync no comparador) */
  deferAutoplay?: boolean;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  {
    videoId,
    title,
    className = 'absolute inset-0 w-full h-full',
    autoplay = true,
    mute = false,
    controls = true,
    loop = false,
    preferMaxQuality = true,
    allowQualitySelection = false,
    isShort = false,
    largeSurface = false,
    onEnded,
    onPlayStateChange,
    onReady,
    deferAutoplay = false,
  },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const cleanupQualityRef = useRef<(() => void) | null>(null);
  const qualityStickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userPickedQualityRef = useRef(false);
  const requestedQualityRef = useRef<YT.PlaybackQuality | 'auto' | null>(null);
  const onReadyRef = useRef(onReady);
  const onEndedRef = useRef(onEnded);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const domId = useId().replace(/:/g, '');

  const stopQualityStick = () => {
    if (qualityStickIntervalRef.current) {
      clearInterval(qualityStickIntervalRef.current);
      qualityStickIntervalRef.current = null;
    }
  };

  const applyRequestedQuality = (player: YT.Player, label: string): boolean => {
    const requested = requestedQualityRef.current;
    if (!requested) return false;
    try {
      if (requested === 'auto') {
        player.setPlaybackQuality?.('default' as YT.PlaybackQuality);
        return true;
      }
      const available = player.getAvailableQualityLevels?.() ?? [];
      if (!available.includes(requested)) {
        logDebug('YouTubePlayer', `${label} qualidade indisponivel:`, requested, available);
        return false;
      }
      player.setPlaybackQuality?.(requested);
      // Algumas versões do iframe respeitam melhor quando a faixa também é definida.
      const withRange = player as YT.Player & {
        setPlaybackQualityRange?: (
          suggestedQuality: YT.PlaybackQuality,
          endQuality?: YT.PlaybackQuality
        ) => void;
      };
      withRange.setPlaybackQualityRange?.(requested, requested);
      return true;
    } catch (e) {
      logDebug('YouTubePlayer', `${label} applyRequestedQuality falhou`, e);
      return false;
    }
  };

  const startQualityStick = (player: YT.Player) => {
    stopQualityStick();
    qualityStickIntervalRef.current = setInterval(() => {
      try {
        const state = player.getPlayerState?.();
        if (state !== 1 && state !== 3) return;
        applyRequestedQuality(player, 'stick-interval');
      } catch {
        /* ignore */
      }
    }, 1100);
  };

  useEffect(() => {
    onReadyRef.current = onReady;
    onEndedRef.current = onEnded;
    onPlayStateChangeRef.current = onPlayStateChange;
  }, [onReady, onEnded, onPlayStateChange]);

  useImperativeHandle(ref, () => ({
    playVideo: () => {
      try {
        playerRef.current?.playVideo();
      } catch {
        /* ignore */
      }
    },
    pauseVideo: () => {
      try {
        playerRef.current?.pauseVideo();
      } catch {
        /* ignore */
      }
    },
    togglePlay: () => {
      try {
        const state = playerRef.current?.getPlayerState();
        if (state === 1) playerRef.current?.pauseVideo();
        else playerRef.current?.playVideo();
      } catch {
        /* ignore */
      }
    },
    seekTo: (seconds: number) => {
      try {
        playerRef.current?.seekTo(seconds, true);
      } catch {
        /* ignore */
      }
    },
    getCurrentTime: () => {
      try {
        return playerRef.current?.getCurrentTime() ?? 0;
      } catch {
        return 0;
      }
    },
    getDuration: () => {
      try {
        return playerRef.current?.getDuration() ?? 0;
      } catch {
        return 0;
      }
    },
    getVideoLoadedFraction: () => {
      try {
        return playerRef.current?.getVideoLoadedFraction() ?? 0;
      } catch {
        return 0;
      }
    },
    getPlayerState: () => {
      try {
        return playerRef.current?.getPlayerState() ?? -1;
      } catch {
        return -1;
      }
    },
    requestFullscreen: () => {
      const iframe = playerRef.current?.getIframe?.() as HTMLElement | undefined;
      const el = iframe ?? containerRef.current ?? hostRef.current;
      if (!el) return;
      const fsEl = el as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (fsEl.requestFullscreen) {
        void fsEl.requestFullscreen().catch(() => {
          /* iOS pode bloquear */
        });
      } else {
        fsEl.webkitRequestFullscreen?.();
      }
    },
    getAvailableQualityLevels: () => {
      try {
        return playerRef.current?.getAvailableQualityLevels?.() ?? [];
      } catch {
        return [];
      }
    },
    getPlaybackQuality: () => {
      try {
        return playerRef.current?.getPlaybackQuality?.() ?? 'auto';
      } catch {
        return 'auto';
      }
    },
    setPlaybackQuality: (quality: YT.PlaybackQuality | 'auto') => {
      userPickedQualityRef.current = true;
      requestedQualityRef.current = quality;
      try {
        const player = playerRef.current;
        if (!player) return;
        if (quality === 'auto') {
          stopQualityStick();
          player.setPlaybackQuality?.('default' as YT.PlaybackQuality);
          return;
        }
        applyRequestedQuality(player, 'handle-set');
        startQualityStick(player);
      } catch {
        /* ignore */
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    userPickedQualityRef.current = false;
    requestedQualityRef.current = null;
    stopQualityStick();

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;

      cleanupQualityRef.current?.();
      playerRef.current?.destroy();
      playerRef.current = null;

      const lockQuality = preferMaxQuality && !allowQualitySelection;
      const showControls = controls || allowQualitySelection;

      const player = new window.YT.Player(hostRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          mute: mute ? 1 : 0,
          controls: showControls ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          iv_load_policy: 3,
          fs: showControls ? 1 : 0,
          disablekb: showControls ? 0 : 1,
          cc_load_policy: 0,
          ...(preferMaxQuality && !allowQualitySelection ? { vq: 'highres' } : {}),
          ...(loop ? { loop: 1, playlist: videoId } : {}),
        },
        events: {
          onReady: (event) => {
            if (autoplay && !deferAutoplay) event.target.playVideo();
            if (preferMaxQuality && !userPickedQualityRef.current) {
              requestAnimationFrame(() => {
                forceMaximumQuality(event.target, 'onReady');
                if (lockQuality) {
                  cleanupQualityRef.current = startQualityEnforcer(event.target, isShort);
                }
              });
            }
            onReadyRef.current?.();
          },
          onPlaybackQualityChange: (event) => {
            if (lockQuality && !userPickedQualityRef.current) {
              forceMaximumQuality(event.target, 'onQualityChange');
              return;
            }
            const requested = requestedQualityRef.current;
            const changedQuality = (event as { data?: YT.PlaybackQuality }).data;
            if (requested && requested !== 'auto' && changedQuality !== requested) {
              setTimeout(() => {
                applyRequestedQuality(event.target, 'onQualityChange-user');
              }, 80);
            }
          },
          onStateChange: (event) => {
            if (event.data === 0) onEndedRef.current?.();
            if (event.data === 1) onPlayStateChangeRef.current?.(true);
            if (event.data === 2) onPlayStateChangeRef.current?.(false);
            if (lockQuality && !userPickedQualityRef.current && (event.data === 1 || event.data === 3)) {
              forceMaximumQuality(event.target, event.data === 3 ? 'onBuffer' : 'onPlay');
              if (!cleanupQualityRef.current) {
                cleanupQualityRef.current = startQualityEnforcer(event.target, isShort);
              }
            }
            if (requestedQualityRef.current && requestedQualityRef.current !== 'auto') {
              applyRequestedQuality(event.target, event.data === 3 ? 'onBuffer-user' : 'onPlay-user');
              startQualityStick(event.target);
            }
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      cleanupQualityRef.current?.();
      cleanupQualityRef.current = null;
      stopQualityStick();
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [
    videoId,
    autoplay,
    mute,
    controls,
    loop,
    preferMaxQuality,
    allowQualitySelection,
    isShort,
    deferAutoplay,
  ]);

  const hostClass = ['dmx-yt-host', largeSurface ? 'dmx-yt-host--large' : ''].filter(Boolean).join(' ');

  return (
    <div ref={containerRef} className={`dmx-yt-root ${className}`.trim()} aria-label={title}>
      <div ref={hostRef} id={`yt-${domId}`} className={hostClass} />
    </div>
  );
});
