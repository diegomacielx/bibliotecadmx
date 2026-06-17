import { useCallback, useEffect, useState } from 'react';

interface MousePosition {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
}

const DEFAULT: MousePosition = { x: 0.5, y: 0.5, clientX: 0, clientY: 0 };

/**
 * Rastreia posição do cursor normalizada (0–1) para efeitos de ambient glow.
 * Usa apenas leitura de eventos — sem layout thrashing.
 */
export function useMousePosition(enabled = true): MousePosition {
  const [position, setPosition] = useState<MousePosition>(DEFAULT);

  useEffect(() => {
    if (!enabled) return;

    let raf = 0;
    let pending = DEFAULT;

    const flush = () => {
      setPosition(pending);
      raf = 0;
    };

    const onMove = (e: MouseEvent) => {
      pending = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
        clientX: e.clientX,
        clientY: e.clientY,
      };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  return position;
}

/** Atualiza --mouse-x / --mouse-y no elemento alvo (percentual local) */
export function useAmbientGlow<T extends HTMLElement>() {
  return useCallback((e: React.MouseEvent<T>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mouse-x', `${x}%`);
    el.style.setProperty('--mouse-y', `${y}%`);
  }, []);
}
