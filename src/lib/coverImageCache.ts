import { getAllCachedCoverEntries, isCoverRecentlyVerified } from './coverCache';
import { isOfficialGitHubCoverUrl } from './coverSource';
import { isSessionCoverReady, setSessionCoverUrl } from './coverImageStore';
import { parseExerciseIdFromGitHubCoverUrl } from './utils';

export const COVER_CACHE_NAME = 'dmx-covers-v1';

const warmInflight = new Set<string>();

function canUseCacheApi(): boolean {
  return typeof window !== 'undefined' && 'caches' in window;
}

/** Capa já está no Cache API (persiste entre logins no mesmo browser). */
export async function isCoverInPersistentCache(url: string): Promise<boolean> {
  if (!canUseCacheApi() || !isOfficialGitHubCoverUrl(url)) return false;
  try {
    const cache = await caches.open(COVER_CACHE_NAME);
    const hit = await cache.match(url, { ignoreSearch: true });
    return !!hit;
  } catch {
    return false;
  }
}

/** Baixa e persiste capa no Cache API (thread principal — complementa o SW). */
export async function ensureCoverCached(url: string): Promise<boolean> {
  if (!canUseCacheApi() || !isOfficialGitHubCoverUrl(url)) return false;
  if (warmInflight.has(url)) return isCoverInPersistentCache(url);

  warmInflight.add(url);
  try {
    const cache = await caches.open(COVER_CACHE_NAME);
    const existing = await cache.match(url, { ignoreSearch: true });
    if (existing) return true;

    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      cache: 'force-cache',
    });
    if (!response.ok) return false;
    await cache.put(url, response.clone());
    return true;
  } catch {
    return false;
  } finally {
    warmInflight.delete(url);
  }
}

const BATCH_CONCURRENCY = 5;

async function warmCoverBatch(items: { firestoreId: string; url: string }[]): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(BATCH_CONCURRENCY, items.length || 1) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      if (!current) continue;
      if (isSessionCoverReady(current.firestoreId)) continue;

      const ok = await ensureCoverCached(current.url);
      if (ok) setSessionCoverUrl(current.firestoreId, current.url);
    }
  });
  await Promise.all(workers);
}

function scheduleIdle(task: () => void, timeout = 2500): void {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => task(), { timeout });
    return;
  }
  globalThis.setTimeout(task, 120);
}

/** Pré-aquece capas conhecidas em localStorage — baixa prioridade, não compete com vídeo. */
export function scheduleKnownCoversWarmup(options?: {
  immediateLimit?: number;
  excludeIds?: Set<string>;
  /** Ordem de exibição no grid — capas visíveis primeiro ao trocar ordenação */
  priorityOrder?: string[];
}): void {
  if (typeof window === 'undefined') return;

  const immediateLimit = options?.immediateLimit ?? 64;
  const exclude = options?.excludeIds ?? new Set<string>();
  const priorityIndex = new Map(
    (options?.priorityOrder ?? []).map((firestoreId, index) => [firestoreId, index])
  );

  const entries = getAllCachedCoverEntries()
    .filter((entry) => !exclude.has(entry.firestoreId))
    .sort((a, b) => {
      const rankA = priorityIndex.get(a.firestoreId);
      const rankB = priorityIndex.get(b.firestoreId);
      if (rankA != null && rankB != null) return rankA - rankB;
      if (rankA != null) return -1;
      if (rankB != null) return 1;

      const idA = parseExerciseIdFromGitHubCoverUrl(a.url);
      const idB = parseExerciseIdFromGitHubCoverUrl(b.url);
      if (idA != null && idB != null) return idA - idB;
      if (idA != null) return -1;
      if (idB != null) return 1;
      return a.ts - b.ts;
    });

  if (entries.length === 0) return;

  const immediate = entries.slice(0, immediateLimit);
  const deferred = entries.slice(immediateLimit);

  for (const entry of immediate) {
    if (isSessionCoverReady(entry.firestoreId)) continue;
    void ensureCoverCached(entry.url).then((ok) => {
      if (ok) setSessionCoverUrl(entry.firestoreId, entry.url);
    });
  }

  if (deferred.length === 0) return;

  scheduleIdle(() => {
    void warmCoverBatch(deferred);
  });
}

/** URL confiável sem novo probe de rede. */
export async function resolveTrustedCoverUrl(
  firestoreId: string,
  url: string
): Promise<string | null> {
  if (!isOfficialGitHubCoverUrl(url)) return null;
  if (isSessionCoverReady(firestoreId)) return url;
  if (await isCoverInPersistentCache(url)) {
    setSessionCoverUrl(firestoreId, url);
    return url;
  }
  if (isCoverRecentlyVerified(firestoreId)) {
    setSessionCoverUrl(firestoreId, url);
    void ensureCoverCached(url);
    return url;
  }
  return null;
}

export function registerCoverServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  const register = () => {
    navigator.serviceWorker.register('/covers-sw.js').catch(() => {
      /* SW opcional — Cache API na thread principal continua ativa */
    });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
