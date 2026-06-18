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

/** Testa URLs em paralelo — retorna a primeira que carregar */
export async function findFirstWorkingCoverUrl(urls: string[]): Promise<string | null> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return null;

  return new Promise((resolve) => {
    let settled = false;
    let remaining = unique.length;

    for (const url of unique) {
      void probeImageUrl(url).then((ok) => {
        if (settled) return;
        if (ok) {
          settled = true;
          resolve(url);
          return;
        }
        remaining -= 1;
        if (remaining === 0) resolve(null);
      });
    }
  });
}

/** Testa PNG/JPG oficiais no GitHub — candidatos em paralelo */
export async function probeExerciseGitHubCover(ex: { id: string }): Promise<boolean> {
  const candidates = getOfficialGitHubCoverCandidates(ex);
  const hit = await findFirstWorkingCoverUrl(candidates);
  return hit !== null;
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
