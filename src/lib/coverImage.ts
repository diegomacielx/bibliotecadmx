import { getCachedCoverUrl } from './coverCache';
import { getYouTubeId, isExerciseIncomplete } from './utils';

/** Miniatura leve para blur-up enquanto a capa principal carrega */
export function getCoverPlaceholderUrl(ex: {
  firestoreId?: string;
  youtubeUrl?: string;
}): string | null {
  if (isExerciseIncomplete(ex.youtubeUrl)) {
    if (ex.firestoreId) {
      return getCachedCoverUrl(ex.firestoreId);
    }
    return null;
  }

  const ytId = getYouTubeId(ex.youtubeUrl);
  if (ytId) {
    return `https://i.ytimg.com/vi/${ytId}/maxresdefault.webp`;
  }

  if (ex.firestoreId) {
    return getCachedCoverUrl(ex.firestoreId);
  }

  return null;
}

/** Par WebP/JPEG quando a URL principal é do YouTube em JPEG */
export function getCoverWebpCompanion(src: string): string | null {
  if (/\.webp(\?|#|$)/i.test(src)) return null;
  const match =
    src.match(/(?:img\.youtube\.com|i\.ytimg\.com)\/vi\/([^/]+)\/([^/?#]+)\.jpe?g/i);
  if (!match) return null;
  return `https://i.ytimg.com/vi/${match[1]}/${match[2]}.webp`;
}

export function shouldUseCoverBlurUp(
  placeholderSrc: string | null,
  fullSrc: string,
  imgLoaded: boolean,
  reducedMotion: boolean
): boolean {
  if (reducedMotion || imgLoaded || !placeholderSrc) return false;
  return placeholderSrc !== fullSrc;
}
