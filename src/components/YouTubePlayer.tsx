import { useEffect, useRef, useId, forwardRef, useImperativeHandle } from 'react';
import { logDebug } from '../lib/utils';

const MAX_QUALITY_ORDER: YT.PlaybackQuality[] = [
  'highres',
  'hd1440',
  'hd1080',
  'hd720',
  'large',
  'medium',
];

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

    for (const quality of MAX_QUALITY_ORDER) {
      if (available.includes(quality)) {
        player.setPlaybackQuality(quality);
        logDebug('YouTubePlayer', `${label} → ${quality}`);
        return quality;
      }
    }

    player.setPlaybackQuality('highres');
    return 'highres' as YT.PlaybackQuality;
  } catch (e) {
    logDebug('YouTubePlayer', 'forceMaximumQuality falhou', e);
    return null;
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
          const state = (player as YT.Player & { getPlayerState?: () => number }).getPlayerState?.();
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
      const state = (player as YT.Player & { getPlayerState?: () => number }).getPlayerState?.();
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
  getPlayerState: () => number;
  requestFullscreen: () => void;
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
  const domId = useId().replace(/:/g, '');

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
    getPlayerState: () => {
      try {
        return playerRef.current?.getPlayerState() ?? -1;
      } catch {
        return -1;
      }
    },
    requestFullscreen: () => {
      const iframe = playerRef.current?.getIframe();
      const el = iframe ?? containerRef.current ?? hostRef.current;
      if (!el) return;
      const fsEl = el as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (fsEl.requestFullscreen) {
        void fsEl.requestFullscreen().catch(() => {
          /* iOS pode bloquear — usuário usa controles nativos do YouTube */
        });
      } else {
        fsEl.webkitRequestFullscreen?.();
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;

      cleanupQualityRef.current?.();
      playerRef.current?.destroy();
      playerRef.current = null;

      const player = new window.YT.Player(hostRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          mute: mute ? 1 : 0,
          controls: controls ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          iv_load_policy: 3,
          fs: 1,
          ...(preferMaxQuality ? { vq: 'highres' } : {}),
          ...(loop ? { loop: 1, playlist: videoId } : {}),
        },
        events: {
          onReady: (event) => {
            if (preferMaxQuality) {
              forceMaximumQuality(event.target, 'onReady');
              cleanupQualityRef.current = startQualityEnforcer(event.target, isShort);
            }
            if (autoplay && !deferAutoplay) event.target.playVideo();
            onReady?.();
          },
          onPlaybackQualityChange: (event) => {
            if (preferMaxQuality) forceMaximumQuality(event.target, 'onQualityChange');
          },
          onStateChange: (event) => {
            if (event.data === 0) onEnded?.();
            if (event.data === 1) onPlayStateChange?.(true);
            if (event.data === 2) onPlayStateChange?.(false);
            if (!preferMaxQuality) return;
            if (event.data === 1 || event.data === 3) {
              forceMaximumQuality(event.target, event.data === 3 ? 'onBuffer' : 'onPlay');
              if (!cleanupQualityRef.current) {
                cleanupQualityRef.current = startQualityEnforcer(event.target, isShort);
              }
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
    isShort,
    onEnded,
    onPlayStateChange,
    onReady,
    deferAutoplay,
  ]);

  return (
    <div ref={containerRef} className={className} aria-label={title}>
      <div
        ref={hostRef}
        id={`yt-${domId}`}
        className={`w-full h-full ${largeSurface ? 'min-w-[min(100%,1280px)] min-h-[480px]' : ''}`}
      />
    </div>
  );
});
