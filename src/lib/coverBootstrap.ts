import { getAllCachedCoverEntries } from './coverCache';
import { isOfficialGitHubCoverUrl } from './coverSource';
import { setSessionCoverUrl } from './coverImageStore';
import { ensureCoverCached } from './coverImageCache';

const BOOTSTRAP_IMMEDIATE = 72;

/** Dispara download das capas em cache antes do React montar — máxima prioridade */
export function bootstrapCoverCache(limit = BOOTSTRAP_IMMEDIATE): void {
  if (typeof window === 'undefined') return;

  const entries = getAllCachedCoverEntries()
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit);

  for (const { firestoreId, url } of entries) {
    if (!isOfficialGitHubCoverUrl(url)) continue;

    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'high';
    }
    img.onload = () => {
      setSessionCoverUrl(firestoreId, url);
      void ensureCoverCached(url);
    };
    img.onerror = () => {};
    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      setSessionCoverUrl(firestoreId, url);
      void ensureCoverCached(url);
    }
  }
}
