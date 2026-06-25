/** Tipos mínimos para YouTube IFrame Player API */
declare namespace YT {
  type PlayerState = -1 | 0 | 1 | 2 | 3 | 5;
  type PlaybackQuality =
    | 'small'
    | 'medium'
    | 'large'
    | 'hd720'
    | 'hd1080'
    | 'hd1440'
    | 'highres'
    | 'auto'
    | 'default'
    | 'tiny';

  interface PlayerOptions {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    host?: string;
    playerVars?: Record<string, string | number>;
    events?: PlayerEvents;
  }

  interface PlayerEvents {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: OnStateChangeEvent) => void;
    onPlaybackQualityChange?: (event: PlayerEvent) => void;
    onError?: (event: OnErrorEvent) => void;
  }

  interface PlayerEvent {
    target: Player;
  }

  interface OnStateChangeEvent extends PlayerEvent {
    data: PlayerState;
  }

  interface OnErrorEvent extends PlayerEvent {
    data: number;
  }

  class Player {
    constructor(element: HTMLElement | string, options: PlayerOptions);
    destroy(): void;
    playVideo(): void;
    pauseVideo(): void;
    cueVideoById(
      videoIdOrOptions: string | { videoId: string; startSeconds?: number; endSeconds?: number },
      startSeconds?: number,
    ): void;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    setPlaybackRate(rate: number): void;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getVideoLoadedFraction(): number;
    getPlayerState(): PlayerState;
    setPlaybackQuality(quality: PlaybackQuality): void;
    getAvailableQualityLevels(): PlaybackQuality[];
    getPlaybackQuality(): PlaybackQuality;
    getIframe(): HTMLIFrameElement;
  }
}

interface Window {
  YT?: {
    Player: typeof YT.Player;
    loaded?: number;
  };
  onYouTubeIframeAPIReady?: () => void;
}
