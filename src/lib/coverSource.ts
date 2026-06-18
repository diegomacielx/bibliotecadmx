import { CUSTOM_LOGO_URL } from './constants';
import { getCachedCoverUrl } from './coverCache';
import {
  GITHUB_COVER_BASE,
  GITHUB_COVER_BASE_FALLBACK,
  getExerciseAssetIds,
  hasValidYouTubeUrl,
} from './utils';

export type CoverSourceKind = 'github' | 'youtube' | 'imgur' | 'logo' | 'external' | 'none';

/** URL aponta para capa oficial no repositório GitHub (bibliotecadmx ou dmx) */
export function isOfficialGitHubCoverUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const normalized = url.trim().toLowerCase();
  const base = GITHUB_COVER_BASE.toLowerCase();
  if (normalized.startsWith(base)) return true;
  return /raw\.githubusercontent\.com\/diegomacielx\/(bibliotecadmx|dmx)\//i.test(normalized);
}

export function classifyCoverUrl(url: string | null | undefined): CoverSourceKind {
  if (!url?.trim()) return 'none';
  const u = url.trim().toLowerCase();

  if (u.includes('imgur.com/rllyq3z') || u === CUSTOM_LOGO_URL.toLowerCase()) return 'logo';
  if (u.includes('imgur.com')) return 'imgur';
  if (isOfficialGitHubCoverUrl(url)) return 'github';
  if (
    u.includes('youtube.com/vi/') ||
    u.includes('ytimg.com/vi/') ||
    u.includes('img.youtube.com')
  ) {
    return 'youtube';
  }
  return 'external';
}

/** URLs candidatas oficiais no GitHub — ordem otimizada, sem duplicar extensão maiúscula */
export function getOfficialGitHubCoverCandidates(ex: { id: string }): string[] {
  const urls: string[] = [];
  const bases = [...new Set([GITHUB_COVER_BASE, GITHUB_COVER_BASE_FALLBACK])];
  const assetIds = getExerciseAssetIds(ex.id).sort((a, b) => {
    if (/^\d{4}$/.test(a) && !/^\d{4}$/.test(b)) return -1;
    if (/^\d{4}$/.test(b) && !/^\d{4}$/.test(a)) return 1;
    return a.length - b.length;
  });

  for (const base of bases) {
    for (const assetId of assetIds) {
      for (const ext of ['png', 'jpg'] as const) {
        urls.push(`${base}/${assetId}.${ext}`);
      }
    }
  }
  return [...new Set(urls)];
}

/** Thumbnail ou cache do navegador apontam para fonte externa (YouTube, Imgur, etc.) */
export function isUsingExternalCoverSource(ex: {
  firestoreId?: string;
  thumbnail?: string;
}): boolean {
  const thumb = ex.thumbnail?.trim();
  if (thumb) {
    const kind = classifyCoverUrl(thumb);
    if (kind !== 'none' && kind !== 'github') return true;
  }

  const cached = ex.firestoreId ? getCachedCoverUrl(ex.firestoreId) : null;
  if (cached) {
    const kind = classifyCoverUrl(cached);
    if (kind !== 'none' && kind !== 'github') return true;
  }

  return false;
}

/**
 * Exercício precisa de capa 4K no GitHub quando:
 * - usa fonte externa (YouTube/imgur/cache) OU
 * - arquivo oficial não existe no repositório
 */
export function exerciseNeedsGitHubCover(
  ex: { firestoreId?: string; id: string; thumbnail?: string; youtubeUrl?: string },
  githubFileExists: boolean
): boolean {
  if (!hasValidYouTubeUrl(ex.youtubeUrl)) return false;
  if (isUsingExternalCoverSource(ex)) return true;
  return !githubFileExists;
}

/** Só YouTube válido entra na auditoria de capas */
export function isEligibleForCoverAudit(ex: { youtubeUrl?: string }): boolean {
  return hasValidYouTubeUrl(ex.youtubeUrl);
}
