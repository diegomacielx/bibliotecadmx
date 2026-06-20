import { buildGitHubCoverUrls } from './utils';
import { findFirstWorkingCoverUrl, probeImageUrl } from './githubCoverProbe';
import { getCachedCoverUrl, isCoverRecentlyVerified } from './coverCache';
import { getSessionCoverUrl, isSessionCoverReady, setSessionCoverUrl } from './coverImageStore';
import { isOfficialGitHubCoverUrl } from './coverSource';
import { ensureCoverCached, resolveTrustedCoverUrl } from './coverImageCache';

export type CoverPriority = 'critical' | 'high' | 'normal' | 'low';

const PRIORITY_RANK: Record<CoverPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const inflight = new Map<string, Promise<string | null>>();

interface QueueItem {
  rank: number;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

const queue: QueueItem[] = [];
let active = 0;
const MAX_CONCURRENT = 32;

function drainQueue(): void {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    queue.sort((a, b) => a.rank - b.rank);
    const item = queue.shift();
    if (!item) break;

    active += 1;
    void item
      .run()
      .then(item.resolve, item.reject)
      .finally(() => {
        active -= 1;
        drainQueue();
      });
  }
}

function schedule<T>(priority: CoverPriority, fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    queue.push({
      rank: PRIORITY_RANK[priority],
      run: fn as () => Promise<unknown>,
      resolve: (value) => resolve(value as T),
      reject,
    });
    drainQueue();
  });
}

export interface CoverResolveSource {
  firestoreId?: string;
  id: string;
}

async function resolveCoverUrls(
  ex: CoverResolveSource,
  urls: string[],
  key: string
): Promise<string | null> {
  if (ex.firestoreId) {
    const cached = getCachedCoverUrl(ex.firestoreId);
    if (cached && isOfficialGitHubCoverUrl(cached)) {
      const trusted = await resolveTrustedCoverUrl(ex.firestoreId, cached);
      if (trusted) {
        inflight.delete(key);
        return trusted;
      }
      if (await probeImageUrl(cached)) {
        setSessionCoverUrl(ex.firestoreId, cached);
        void ensureCoverCached(cached);
        inflight.delete(key);
        return cached;
      }
    }
  }

  const hit = await findFirstWorkingCoverUrl(urls);
  if (hit && ex.firestoreId) {
    setSessionCoverUrl(ex.firestoreId, hit);
    void ensureCoverCached(hit);
  }
  inflight.delete(key);
  return hit;
}

/** Resolve capa GitHub com cache, dedupe e fila prioritária */
export function resolveExerciseCoverUrl(
  ex: CoverResolveSource,
  priority: CoverPriority = 'normal'
): Promise<string | null> {
  const urls = buildGitHubCoverUrls(ex);
  if (urls.length === 0) return Promise.resolve(null);

  if (ex.firestoreId) {
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isOfficialGitHubCoverUrl(sessionUrl) && isSessionCoverReady(ex.firestoreId)) {
      return Promise.resolve(sessionUrl);
    }

    const cached = getCachedCoverUrl(ex.firestoreId);
    if (cached && isOfficialGitHubCoverUrl(cached) && isCoverRecentlyVerified(ex.firestoreId)) {
      const key = ex.firestoreId || ex.id;
      const trustedPromise = resolveTrustedCoverUrl(ex.firestoreId, cached).then((trusted) => {
        if (trusted) {
          inflight.delete(key);
          return trusted;
        }
        return schedule(priority, () => resolveCoverUrls(ex, urls, key));
      });
      inflight.set(key, trustedPromise);
      return trustedPromise;
    }
  }

  const key = ex.firestoreId || ex.id;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = schedule(priority, () => resolveCoverUrls(ex, urls, key));
  inflight.set(key, promise);
  return promise;
}

const CRITICAL_VISIBLE = 16;
const HIGH_VISIBLE = 56;

/** Dispara resolução em camadas — viewport primeiro, resto depois */
export function primeCoversFromExerciseList(
  exercises: CoverResolveSource[],
  options?: { heroFirestoreId?: string | null }
): void {
  const list = exercises.filter((ex) => ex.firestoreId && ex.id);
  if (list.length === 0) return;

  const seen = new Set<string>();
  const ordered: CoverResolveSource[] = [];

  const pushUnique = (ex: CoverResolveSource | undefined) => {
    if (!ex?.firestoreId || seen.has(ex.firestoreId)) return;
    seen.add(ex.firestoreId);
    ordered.push(ex);
  };

  if (options?.heroFirestoreId) {
    pushUnique(list.find((ex) => ex.firestoreId === options.heroFirestoreId));
  }

  for (const ex of list) pushUnique(ex);

  ordered.slice(0, CRITICAL_VISIBLE).forEach((ex) => {
    void resolveExerciseCoverUrl(ex, 'critical');
  });

  ordered.slice(CRITICAL_VISIBLE, CRITICAL_VISIBLE + HIGH_VISIBLE).forEach((ex) => {
    void resolveExerciseCoverUrl(ex, 'high');
  });

  ordered.slice(CRITICAL_VISIBLE + HIGH_VISIBLE).forEach((ex) => {
    void resolveExerciseCoverUrl(ex, 'normal');
  });
}

/** Pré-resolve capas — atalho com prioridade normal */
export function prefetchExerciseCovers(
  exercises: CoverResolveSource[],
  priority: CoverPriority = 'normal'
): void {
  for (const ex of exercises) {
    void resolveExerciseCoverUrl(ex, priority);
  }
}
