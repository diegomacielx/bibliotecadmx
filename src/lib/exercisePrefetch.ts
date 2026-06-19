import type { Exercise } from '../types';
import { resolveExerciseCoverUrl } from './coverResolver';

type CoverSource = Pick<Exercise, 'firestoreId' | 'id' | 'thumbnail' | 'youtubeUrl'>;

const prefetchedIds = new Set<string>();

let cinemaLightboxChunkStarted = false;

function scheduleIdle(task: () => void): void {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 900 });
    return;
  }
  setTimeout(task, 0);
}

/** Pré-carrega capa de um exercício (deduplicado por firestoreId) */
export function prefetchExerciseCover(ex: CoverSource, priority: 'critical' | 'high' = 'high'): void {
  if (typeof window === 'undefined' || !ex.firestoreId) return;
  if (prefetchedIds.has(ex.firestoreId)) return;

  prefetchedIds.add(ex.firestoreId);
  void resolveExerciseCoverUrl(ex, priority);
}

/** Hover no card — capa atual + vizinhos na grid, prioridade baixa nos peers */
export function prefetchExerciseHoverBundle(ex: CoverSource, peers: CoverSource[] = []): void {
  prefetchExerciseCover(ex, 'critical');
  if (peers.length === 0) return;

  scheduleIdle(() => {
    for (const peer of peers) {
      prefetchExerciseCover(peer, 'high');
    }
  });
}

/** Lightbox ← → — pré-carrega anterior e próximo da fila atual */
export function prefetchExerciseNeighbors(list: Exercise[], activeIndex: number): void {
  if (list.length < 2 || activeIndex < 0) return;

  const targets: Exercise[] = [];
  if (activeIndex > 0) targets.push(list[activeIndex - 1]);
  if (activeIndex < list.length - 1) targets.push(list[activeIndex + 1]);

  scheduleIdle(() => {
    for (const ex of targets) {
      prefetchExerciseCover(ex, 'high');
    }
  });
}

/** Chunk do player cinema — abertura do lightbox mais rápida após hover */
export function prefetchCinemaLightboxChunk(): void {
  if (cinemaLightboxChunkStarted || typeof window === 'undefined') return;
  cinemaLightboxChunkStarted = true;
  scheduleIdle(() => {
    void import('../components/CinemaLightbox');
  });
}

export function getGridPrefetchPeers(list: Exercise[], index: number): Exercise[] {
  const peers: Exercise[] = [];
  if (index > 0) peers.push(list[index - 1]);
  if (index + 1 < list.length) peers.push(list[index + 1]);
  return peers;
}
