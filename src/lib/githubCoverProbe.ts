import { getOfficialGitHubCoverCandidates } from './coverSource';

const urlProbeCache = new Map<string, boolean>();

function cacheKey(url: string): string {
  return url.trim().toLowerCase();
}

/** Verifica se a URL de imagem responde (via Image onload) */
export function probeImageUrl(url: string): Promise<boolean> {
  const key = cacheKey(url);
  const cached = urlProbeCache.get(key);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    const finish = (ok: boolean) => {
      urlProbeCache.set(key, ok);
      resolve(ok);
    };
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  });
}

/** Testa PNG/JPG oficiais no GitHub — para no primeiro hit */
export async function probeExerciseGitHubCover(ex: { id: string }): Promise<boolean> {
  const candidates = getOfficialGitHubCoverCandidates(ex);
  for (const url of candidates) {
    if (await probeImageUrl(url)) return true;
  }
  return false;
}

const CONCURRENCY = 10;

/** Sonda capas GitHub em lote (deduplicado por ID de exercício) */
export async function probeGitHubCoversBatch(
  exercises: { firestoreId: string; id: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const total = exercises.length;
  let done = 0;

  const queue = [...exercises];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, async () => {
    while (queue.length > 0) {
      const ex = queue.shift();
      if (!ex) break;
      const exists = await probeExerciseGitHubCover(ex);
      result.set(ex.firestoreId, exists);
      done += 1;
      onProgress?.(done, total);
    }
  });

  await Promise.all(workers);
  return result;
}

export function clearGitHubCoverProbeCache(): void {
  urlProbeCache.clear();
}
