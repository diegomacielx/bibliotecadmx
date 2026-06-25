import { useEffect, useRef, useId, forwardRef, useImperativeHandle } from 'react';

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

export interface YouTubePlayerHandle {
  playVideo: () => void;
  pauseVideo: () => void;
  togglePlay: () => void;
  /** Carrega o vídeo pausado no frame inicial — sem overlay de play do Shorts */
  cueVideoAt: (startSeconds: number) => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoLoadedFraction: () => number;
  getPlayerState: () => number;
  requestFullscreen: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setPlaybackRate: (rate: number) => void;
}

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  className?: string;
  autoplay?: boolean;
  mute?: boolean;
  controls?: boolean;
  /** Player grande (lightbox) — YouTube libera qualidades mais altas conforme o tamanho */
  largeSurface?: boolean;
  onEnded?: () => void;
  onPlayStateChange?: (playing: boolean) => void;
  /** Estado bruto YT.PlayerState — útil para auto-resume no feed */
  onPlayerState?: (state: number) => void;
  /** Primeiro frame visível (PLAYING ou BUFFERING) — esconde splash do YouTube */
  onFrameVisible?: () => void;
  onReady?: () => void;
  /** Aguarda play externo (ex.: sync no comparador) */
  deferAutoplay?: boolean;
  /** Mobile vertical (Shorts): controles nativos com qualidade */
  mobileVertical?: boolean;
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer(
  {
    videoId,
    title,
    className = 'absolute inset-0 w-full h-full',
    autoplay = true,
    mute = false,
    controls = true,
    largeSurface = false,
    onEnded,
    onPlayStateChange,
    onPlayerState,
    onFrameVisible,
    onReady,
    deferAutoplay = false,
    mobileVertical = false,
  },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const muteRef = useRef(mute);
  const autoplayRef = useRef(autoplay);
  const deferAutoplayRef = useRef(deferAutoplay);
  const onReadyRef = useRef(onReady);
  const onEndedRef = useRef(onEnded);
  const onPlayStateChangeRef = useRef(onPlayStateChange);
  const onPlayerStateRef = useRef(onPlayerState);
  const onFrameVisibleRef = useRef(onFrameVisible);
  const domId = useId().replace(/:/g, '');

  useEffect(() => {
    onReadyRef.current = onReady;
    onEndedRef.current = onEnded;
    onPlayStateChangeRef.current = onPlayStateChange;
    onPlayerStateRef.current = onPlayerState;
    onFrameVisibleRef.current = onFrameVisible;
    autoplayRef.current = autoplay;
    deferAutoplayRef.current = deferAutoplay;
  }, [onReady, onEnded, onPlayStateChange, onPlayerState, onFrameVisible, autoplay, deferAutoplay]);

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
    cueVideoAt: (startSeconds: number) => {
      try {
        playerRef.current?.cueVideoById({ videoId, startSeconds });
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
    mute: () => {
      try {
        playerRef.current?.mute();
      } catch {
        /* ignore */
      }
    },
    unMute: () => {
      try {
        playerRef.current?.unMute();
      } catch {
        /* ignore */
      }
    },
    isMuted: () => {
      try {
        return playerRef.current?.isMuted() ?? true;
      } catch {
        return true;
      }
    },
    setPlaybackRate: (rate: number) => {
      try {
        playerRef.current?.setPlaybackRate(rate);
      } catch {
        /* ignore */
      }
    },
  }));

  useEffect(() => {
    muteRef.current = mute;
    try {
      if (mute) playerRef.current?.mute();
      else playerRef.current?.unMute();
    } catch {
      /* ignore */
    }
  }, [mute]);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !hostRef.current || !window.YT?.Player) return;

      playerRef.current?.destroy();
      playerRef.current = null;

      const showControls = controls;
      const startMuted = muteRef.current;

      const player = new window.YT.Player(hostRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube.com',
        playerVars: {
          autoplay: 0,
          mute: startMuted ? 1 : 0,
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
        },
        events: {
          onReady: (event) => {
            try {
              const iframe = event.target.getIframe?.() as HTMLIFrameElement | undefined;
              if (iframe && !showControls) {
                iframe.setAttribute(
                  'allow',
                  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                );
                iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
              }
            } catch {
              /* ignore */
            }
            if (autoplayRef.current && !deferAutoplayRef.current) event.target.playVideo();
            onReadyRef.current?.();
          },
          onStateChange: (event) => {
            onPlayerStateRef.current?.(event.data);
            if (event.data === 0) onEndedRef.current?.();
            if (event.data === 1 || event.data === 3) {
              onFrameVisibleRef.current?.();
              onPlayStateChangeRef.current?.(true);
            }
            if (event.data === 2) onPlayStateChangeRef.current?.(false);
          },
        },
      });

      playerRef.current = player;
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId, controls, mobileVertical, largeSurface]);

  const hostClass = ['dmx-yt-host', largeSurface ? 'dmx-yt-host--large' : ''].filter(Boolean).join(' ');
  const rootClass = [
    'dmx-yt-root',
    !controls ? 'dmx-yt-root--chromeless' : '',
    mobileVertical ? 'dmx-yt-root--mobile-vertical' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={containerRef} className={`${rootClass} ${className}`.trim()} aria-label={title}>
      <div ref={hostRef} id={`yt-${domId}`} className={hostClass} />
    </div>
  );
});
