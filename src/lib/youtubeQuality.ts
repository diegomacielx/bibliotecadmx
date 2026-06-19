import type { YouTubePlayerHandle } from '../components/YouTubePlayer';

export type YoutubeQualityLevel = YT.PlaybackQuality;

export const YOUTUBE_QUALITY_ORDER: YoutubeQualityLevel[] = [
  'highres',
  'hd1440',
  'hd1080',
  'hd720',
  'large',
  'medium',
  'small',
  'tiny',
];

export const YOUTUBE_QUALITY_LABELS: Record<string, string> = {
  auto: 'Automática',
  default: 'Automática',
  highres: '4K',
  hd1440: '1440p',
  hd1080: '1080p',
  hd720: '720p',
  large: '480p',
  medium: '360p',
  small: '240p',
  tiny: '144p',
};

export function labelYouTubeQuality(quality: string): string {
  return YOUTUBE_QUALITY_LABELS[quality] ?? quality.toUpperCase();
}

export function sortYouTubeQualities(levels: YoutubeQualityLevel[]): YoutubeQualityLevel[] {
  const rank = new Map(YOUTUBE_QUALITY_ORDER.map((q, i) => [q, i]));
  return [...levels].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}

export function readYouTubeQualities(player: YouTubePlayerHandle | null): {
  levels: YoutubeQualityLevel[];
  current: YoutubeQualityLevel | 'auto';
} {
  if (!player) return { levels: [], current: 'auto' };
  try {
    const raw = player.getAvailableQualityLevels?.() ?? [];
    const levels = sortYouTubeQualities(raw.filter(Boolean) as YoutubeQualityLevel[]);
    const current = (player.getPlaybackQuality?.() ?? 'auto') as YoutubeQualityLevel | 'auto';
    return { levels, current };
  } catch {
    return { levels: [], current: 'auto' };
  }
}

export function applyInitialMaxQuality(player: YT.Player): void {
  try {
    const available = player.getAvailableQualityLevels?.() ?? [];
    for (const quality of YOUTUBE_QUALITY_ORDER) {
      if (available.includes(quality)) {
        player.setPlaybackQuality(quality);
        return;
      }
    }
  } catch {
    /* ignore */
  }
}
