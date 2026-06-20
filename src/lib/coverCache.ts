import { readJSON, writeJSON } from './storage';
import { isOfficialGitHubCoverUrl } from './coverSource';

const COVER_CACHE_KEY = 'dmx_cover_hits_v4';
const MAX_ENTRIES = 800;
/** URLs validadas recentemente — evita re-probe desnecessário */
export const COVER_TRUST_MS = 14 * 24 * 60 * 60 * 1000;

interface CoverHit {
  url: string;
  ts: number;
}

function readMap(): Record<string, CoverHit> {
  return readJSON<Record<string, CoverHit>>(COVER_CACHE_KEY, {});
}

/** URL de capa GitHub que funcionou na última visita */
export function getCachedCoverUrl(firestoreId: string): string | null {
  if (!firestoreId) return null;
  const hit = readMap()[firestoreId];
  if (!hit?.url || !isOfficialGitHubCoverUrl(hit.url)) return null;
  return hit.url;
}

/** Persiste capa GitHub que carregou com sucesso */
export function rememberCoverUrl(firestoreId: string, url: string): void {
  if (!firestoreId || !url || url.startsWith('blob:')) return;
  if (!isOfficialGitHubCoverUrl(url)) return;

  const map = readMap();
  map[firestoreId] = { url, ts: Date.now() };

  const entries = Object.entries(map);
  if (entries.length > MAX_ENTRIES) {
    entries.sort((a, b) => b[1].ts - a[1].ts);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    writeJSON(COVER_CACHE_KEY, trimmed);
    return;
  }

  writeJSON(COVER_CACHE_KEY, map);
}

export function isCoverRecentlyVerified(firestoreId: string): boolean {
  if (!firestoreId) return false;
  const hit = readMap()[firestoreId];
  if (!hit?.url || !isOfficialGitHubCoverUrl(hit.url)) return false;
  return Date.now() - hit.ts < COVER_TRUST_MS;
}

export function getAllCachedCoverEntries(): { firestoreId: string; url: string; ts: number }[] {
  return Object.entries(readMap())
    .map(([firestoreId, hit]) => ({ firestoreId, url: hit.url, ts: hit.ts }))
    .filter((entry) => entry.url && isOfficialGitHubCoverUrl(entry.url));
}

/** Remove URL de capa inválida do cache */
export function forgetCoverUrl(firestoreId: string, failedUrl?: string): void {
  if (!firestoreId) return;
  const map = readMap();
  const hit = map[firestoreId];
  if (!hit) return;
  if (failedUrl && hit.url !== failedUrl) return;
  delete map[firestoreId];
  writeJSON(COVER_CACHE_KEY, map);
}

/** Pré-aquece capas em background */
export function prefetchCoverUrls(urls: string[]): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (!url || !isOfficialGitHubCoverUrl(url)) continue;
    const img = new Image();
    img.decoding = 'async';
    if ('fetchPriority' in img) {
      (img as HTMLImageElement & { fetchPriority: string }).fetchPriority = 'high';
    }
    img.src = url;
  }
}
