import { useEffect, useMemo, useState } from 'react';
import type { Exercise } from '../types';
import { isEligibleForCoverAudit, isUsingExternalCoverSource } from '../lib/coverSource';
import { probeGitHubCoversBatch } from '../lib/githubCoverProbe';

interface UseGitHubCoverProbeResult {
  /** firestoreId → arquivo PNG/JPG existe no GitHub */
  probeMap: Map<string, boolean>;
  loading: boolean;
  progress: { done: number; total: number };
}

/**
 * Sonda o repositório GitHub quando o filtro admin de capas está ativo.
 * Exercícios com thumbnail/cache externo não precisam de sonda (já são "capa ❌").
 */
export function useGitHubCoverProbe(
  exercises: Exercise[],
  enabled: boolean
): UseGitHubCoverProbeResult {
  const [probeMap, setProbeMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const eligible = useMemo(
    () => exercises.filter((ex) => isEligibleForCoverAudit(ex)),
    [exercises]
  );

  const needsProbe = useMemo(
    () => eligible.filter((ex) => !isUsingExternalCoverSource(ex)),
    [eligible]
  );

  const probeKey = useMemo(
    () => needsProbe.map((ex) => `${ex.firestoreId}:${ex.id}`).join('|'),
    [needsProbe]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setProgress({ done: 0, total: needsProbe.length });

    const externalOnly = new Map<string, boolean>();
    for (const ex of eligible) {
      if (isUsingExternalCoverSource(ex)) {
        externalOnly.set(ex.firestoreId, false);
      }
    }

    if (needsProbe.length === 0) {
      setProbeMap(externalOnly);
      setLoading(false);
      return;
    }

    void probeGitHubCoversBatch(needsProbe, (done, total) => {
      if (!cancelled) setProgress({ done, total });
    }).then((probed) => {
      if (cancelled) return;
      const merged = new Map<string, boolean>(externalOnly);
      for (const [id, exists] of probed) {
        merged.set(id, exists);
      }
      setProbeMap(merged);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, probeKey, eligible, needsProbe]);

  return { probeMap, loading, progress };
}

/** Resolve se exercício com YouTube válido precisa de capa oficial no GitHub */
export function resolveNeedsGitHubCover(
  ex: Exercise,
  probeMap: Map<string, boolean>,
  probeComplete: boolean
): boolean | null {
  if (!isEligibleForCoverAudit(ex)) return null;
  if (isUsingExternalCoverSource(ex)) return true;
  if (!probeComplete) return null;
  return !probeMap.get(ex.firestoreId);
}
