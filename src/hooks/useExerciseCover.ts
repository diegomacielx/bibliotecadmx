import { useState, useRef, useEffect, useCallback } from 'react';
import { CUSTOM_LOGO_URL } from '../lib/constants';
import { buildExerciseImageFallbacks } from '../lib/utils';
import {
  getSessionCoverUrl,
  isSessionCoverReady,
  setSessionCoverUrl,
  clearSessionCoverUrl,
} from '../lib/coverImageStore';
import { getCachedCoverUrl } from '../lib/coverCache';

interface CoverSource {
  firestoreId: string;
  id: string;
  thumbnail?: string;
  youtubeUrl?: string;
}

export function useExerciseCover(ex: CoverSource) {
  const fallbacksRef = useRef(buildExerciseImageFallbacks(ex));
  const fallbackIndexRef = useRef(0);

  const resolveInitial = useCallback(() => {
    fallbacksRef.current = buildExerciseImageFallbacks(ex);
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isSessionCoverReady(ex.firestoreId)) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      return { src: sessionUrl, loaded: true };
    }
    if (sessionUrl) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      const fromDisk = getCachedCoverUrl(ex.firestoreId) === sessionUrl;
      return { src: sessionUrl, loaded: fromDisk };
    }
    fallbackIndexRef.current = 0;
    return {
      src: fallbacksRef.current[0] || CUSTOM_LOGO_URL,
      loaded: false,
    };
  }, [ex]);

  const initial = resolveInitial();
  const [imgSrc, setImgSrc] = useState(initial.src);
  const [imgLoaded, setImgLoaded] = useState(initial.loaded);

  useEffect(() => {
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    fallbacksRef.current = buildExerciseImageFallbacks(ex);

    if (sessionUrl && isSessionCoverReady(ex.firestoreId)) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      setImgSrc(sessionUrl);
      setImgLoaded(true);
      return;
    }

    if (sessionUrl) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      setImgSrc(sessionUrl);
      setImgLoaded(isSessionCoverReady(ex.firestoreId) || getCachedCoverUrl(ex.firestoreId) === sessionUrl);
      return;
    }

    fallbackIndexRef.current = 0;
    setImgSrc(fallbacksRef.current[0] || CUSTOM_LOGO_URL);
    setImgLoaded(false);
  }, [ex.firestoreId, ex.id, ex.thumbnail, ex.youtubeUrl]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const url = e.currentTarget.currentSrc || e.currentTarget.src;
      setImgLoaded(true);
      if (url && !url.includes('imgur.com/rLLYQ3Z')) {
        setSessionCoverUrl(ex.firestoreId, url);
      }
    },
    [ex.firestoreId]
  );

  const handleError = useCallback(() => {
    clearSessionCoverUrl(ex.firestoreId, imgSrc);
    setImgLoaded(false);
    const nextIndex = fallbackIndexRef.current + 1;
    fallbackIndexRef.current = nextIndex;
    if (nextIndex < fallbacksRef.current.length) {
      setImgLoaded(isSessionCoverReady(ex.firestoreId));
      setImgSrc(fallbacksRef.current[nextIndex]);
      return;
    }
    setImgLoaded(true);
    setImgSrc(CUSTOM_LOGO_URL);
  }, [ex.firestoreId, imgSrc]);

  return { imgSrc, imgLoaded, handleLoad, handleError };
}
