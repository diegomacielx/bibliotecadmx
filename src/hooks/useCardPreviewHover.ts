import { useCallback, useEffect, useRef } from 'react';

interface UseCardPreviewHoverOptions {
  enabled: boolean;
  delayMs: number;
  onActivate: () => void;
  onDeactivate: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

/**
 * Hover de preview no card — usa mouseenter/mouseleave (não pointer),
 * pois mouseleave não dispara ao mover para filhos; pointerleave em mediaRef
 * cancelava o preview ao entrar na card-top-bar (irmã do media).
 */
export function useCardPreviewHover({
  enabled,
  delayMs,
  onActivate,
  onDeactivate,
  onHoverStart,
  onHoverEnd,
}: UseCardPreviewHoverOptions) {
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearEnterTimer = useCallback(() => {
    if (enterTimerRef.current) {
      clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
  }, []);

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    if (!enabled) return;

    clearLeaveTimer();
    onHoverStart?.();

    if (activeRef.current) return;

    clearEnterTimer();
    enterTimerRef.current = setTimeout(() => {
      activeRef.current = true;
      onActivate();
    }, delayMs);
  }, [clearEnterTimer, clearLeaveTimer, delayMs, enabled, onActivate, onHoverStart]);

  const onMouseLeave = useCallback(() => {
    clearEnterTimer();
    onHoverEnd?.();

    clearLeaveTimer();
    leaveTimerRef.current = setTimeout(() => {
      activeRef.current = false;
      onDeactivate();
    }, 360);
  }, [clearEnterTimer, clearLeaveTimer, onDeactivate, onHoverEnd]);

  useEffect(
    () => () => {
      clearEnterTimer();
      clearLeaveTimer();
    },
    [clearEnterTimer, clearLeaveTimer]
  );

  return { onMouseEnter, onMouseLeave };
}
