/** Posição salva ao sair de um reel — estilo TikTok/Instagram */
interface ReelsSnapshot {
  time: number;
  canResume: boolean;
}

const snapshots = new Map<string, ReelsSnapshot>();

export function reelsSavePosition(exerciseId: string, time: number): void {
  const existing = snapshots.get(exerciseId);
  snapshots.set(exerciseId, { time, canResume: existing?.canResume ?? false });
}

/** Ao avançar: salva posição e invalida resume do reel dois passos atrás */
export function reelsMarkForwardLeave(
  exerciseId: string,
  time: number,
  invalidateResumeId?: string | null
): void {
  snapshots.set(exerciseId, { time, canResume: true });
  if (!invalidateResumeId) return;
  const older = snapshots.get(invalidateResumeId);
  if (older) snapshots.set(invalidateResumeId, { ...older, canResume: false });
}

/** Ao voltar um passo: salva posição do reel que está saindo */
export function reelsMarkBackwardLeave(exerciseId: string, time: number): void {
  snapshots.set(exerciseId, { time, canResume: true });
}

/** Segundos ao entrar no reel após navegação */
export function reelsEntrySeekSeconds(exerciseId: string, via: 'next' | 'prev'): number {
  if (via === 'next') return 0;
  const snap = snapshots.get(exerciseId);
  return snap?.canResume ? snap.time : 0;
}

/** Posição do reel adjacente ao pré-carregar durante o scroll */
export function reelsAdjacentSeekSeconds(exerciseId: string, role: 'prev' | 'next'): number {
  if (role === 'next') return 0;
  const snap = snapshots.get(exerciseId);
  return snap?.canResume ? snap.time : 0;
}

export function reelsResetPlaybackMemory(): void {
  snapshots.clear();
}
