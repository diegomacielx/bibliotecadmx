import { buildGitHubCoverUrls } from './utils';
import { findFirstWorkingCoverUrl, probeImageUrl } from './githubCoverProbe';
import { getCachedCoverUrl } from './coverCache';
import { getSessionCoverUrl, isSessionCoverReady, setSessionCoverUrl } from './coverImageStore';
import { isOfficialGitHubCoverUrl } from './coverSource';

const inflight = new Map<string, Promise<string | null>>();
const queue: Array<() => void> = [];
let active = 0;
const MAX_CONCURRENT = 14;

function schedule<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = async () => {
      active += 1;
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      } finally {
        active -= 1;
        const next = queue.shift();
        if (next) next();
      }
    };
    if (active < MAX_CONCURRENT) void run();
    else queue.push(run);
  });
}

export interface CoverResolveSource {
  firestoreId?: string;
  id: string;
}

/** Resolve capa GitHub com cache de sessão, dedupe e fila de concorrência */
export function resolveExerciseCoverUrl(ex: CoverResolveSource): Promise<string | null> {
  const urls = buildGitHubCoverUrls(ex);
  if (urls.length === 0) return Promise.resolve(null);

  if (ex.firestoreId) {
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isOfficialGitHubCoverUrl(sessionUrl) && isSessionCoverReady(ex.firestoreId)) {
      return Promise.resolve(sessionUrl);
    }

    const cached = getCachedCoverUrl(ex.firestoreId);
    if (cached && isOfficialGitHubCoverUrl(cached)) {
      const key = ex.firestoreId;
      const pending = inflight.get(key);
      if (pending) return pending;

      const promise = schedule(async () => {
        if (await probeImageUrl(cached)) {
          setSessionCoverUrl(ex.firestoreId!, cached);
          inflight.delete(key);
          return cached;
        }
        const hit = await findFirstWorkingCoverUrl(urls.filter((url) => url !== cached));
        if (hit) setSessionCoverUrl(ex.firestoreId!, hit);
        inflight.delete(key);
        return hit;
      });

      inflight.set(key, promise);
      return promise;
    }
  }

  const key = ex.firestoreId || ex.id;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = schedule(async () => {
    const hit = await findFirstWorkingCoverUrl(urls);
    if (hit && ex.firestoreId) setSessionCoverUrl(ex.firestoreId, hit);
    inflight.delete(key);
    return hit;
  });

  inflight.set(key, promise);
  return promise;
}

/** Pré-resolve capas visíveis sem bloquear a UI */
export function prefetchExerciseCovers(exercises: CoverResolveSource[]): void {
  for (const ex of exercises) {
    void resolveExerciseCoverUrl(ex);
  }
}
