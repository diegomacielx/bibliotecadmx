import { readJSON, writeJSON } from './storage';

const COVER_CACHE_KEY = 'dmx_cover_hits';
const MAX_ENTRIES = 800;

interface CoverHit {
  url: string;
  ts: number;
}

function readMap(): Record<string, CoverHit> {
  return readJSON<Record<string, CoverHit>>(COVER_CACHE_KEY, {});
}

/** URL de capa que funcionou na última visita — carregamento instantâneo */
export function getCachedCoverUrl(firestoreId: string): string | null {
  if (!firestoreId) return null;
  const hit = readMap()[firestoreId];
  return hit?.url ?? null;
}

/** Persiste a URL que carregou com sucesso para priorizar no próximo login */
export function rememberCoverUrl(firestoreId: string, url: string): void {
  if (!firestoreId || !url || url.startsWith('blob:')) return;

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

/** Pré-aquece capas visíveis em background (baixa prioridade) */
export function prefetchCoverUrls(urls: string[]): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (!url) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
