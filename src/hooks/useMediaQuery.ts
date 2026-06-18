import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** Layout mobile do lightbox e cards — não afeta desktop */
export function useMobileUi() {
  return useMediaQuery('(max-width: 767px)');
}

/** Touch / celular — inclui telas estreitas e dispositivos touch */
export function useTouchLayout() {
  return useMediaQuery('(max-width: 767px), (hover: none) and (pointer: coarse)');
}

export function isMobileUi(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

export function isTouchUi(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches;
}

export function isTouchLayout(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)').matches
  );
}

/** @deprecated use isTouchLayout */
export function isCoarsePointer(): boolean {
  return isTouchLayout();
}
