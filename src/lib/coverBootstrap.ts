import { readJSON } from './storage';
import { isOfficialGitHubCoverUrl } from './coverSource';
import { setSessionCoverUrl } from './coverImageStore';

const COVER_CACHE_KEY = 'dmx_cover_hits_v4';

/** Dispara download das capas em cache antes do React montar — máxima prioridade */
export function bootstrapCoverCache(limit = 48): void {
  if (typeof window === 'undefined') return;

  const map = readJSON<Record<string, { url: string; ts: number }>>(COVER_CACHE_KEY, {});
  const entries = Object.entries(map)
    .filter(([, hit]) => hit?.url && isOfficialGitHubCoverUrl(hit.url))
    .sort((a, b) => b[1].ts - a[1].ts)
    .slice(0, limit);

  for (const [firestoreId, hit] of entries) {
    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'high';
    }
    img.onload = () => setSessionCoverUrl(firestoreId, hit.url);
    img.onerror = () => {};
    img.src = hit.url;
    if (img.complete && img.naturalWidth > 0) {
      setSessionCoverUrl(firestoreId, hit.url);
    }
  }
}
