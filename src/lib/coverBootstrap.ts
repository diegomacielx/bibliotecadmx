import { getAllCachedCoverEntries } from './coverCache';
import { isOfficialGitHubCoverUrl } from './coverSource';
import { setSessionCoverUrl } from './coverImageStore';
import { ensureCoverCached } from './coverImageCache';
import { parseExerciseIdFromGitHubCoverUrl } from './utils';

const BOOTSTRAP_IMMEDIATE = 72;

function sortCoverEntriesByExerciseIdAsc<T extends { url: string }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const idA = parseExerciseIdFromGitHubCoverUrl(a.url);
    const idB = parseExerciseIdFromGitHubCoverUrl(b.url);
    if (idA != null && idB != null) return idA - idB;
    if (idA != null) return -1;
    if (idB != null) return 1;
    return 0;
  });
}

/** Dispara download das capas em cache antes do React montar — menor ID primeiro */
export function bootstrapCoverCache(limit = BOOTSTRAP_IMMEDIATE): void {
  if (typeof window === 'undefined') return;

  const entries = sortCoverEntriesByExerciseIdAsc(getAllCachedCoverEntries()).slice(0, limit);

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
