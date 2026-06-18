import { useState, useRef, useEffect, useCallback } from 'react';
import { CUSTOM_LOGO_URL } from '../lib/constants';
import { buildExerciseImageFallbacks, isYouTubeCoverUrl } from '../lib/utils';
import {
  getSessionCoverUrl,
  isSessionCoverReady,
  setSessionCoverUrl,
  clearSessionCoverUrl,
} from '../lib/coverImageStore';
import { getCachedCoverUrl } from '../lib/coverCache';
import { getCoverPlaceholderUrl, getCoverWebpCompanion, shouldUseCoverBlurUp } from '../lib/coverImage';

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
  const [isCoverInstant, setIsCoverInstant] = useState(
    isSessionCoverReady(ex.firestoreId) ||
      (initial.loaded && getCachedCoverUrl(ex.firestoreId) === initial.src)
  );
  const placeholderSrc = getCoverPlaceholderUrl(ex);
  const webpSrc = getCoverWebpCompanion(imgSrc);

  useEffect(() => {
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    fallbacksRef.current = buildExerciseImageFallbacks(ex);

    if (sessionUrl && isSessionCoverReady(ex.firestoreId)) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      setImgSrc(sessionUrl);
      setImgLoaded(true);
      setIsCoverInstant(true);
      return;
    }

    if (sessionUrl) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      setImgSrc(sessionUrl);
      const cachedHit = getCachedCoverUrl(ex.firestoreId) === sessionUrl;
      setImgLoaded(isSessionCoverReady(ex.firestoreId) || cachedHit);
      setIsCoverInstant(isSessionCoverReady(ex.firestoreId) || cachedHit);
      return;
    }

    fallbackIndexRef.current = 0;
    setImgSrc(fallbacksRef.current[0] || CUSTOM_LOGO_URL);
    setImgLoaded(false);
    setIsCoverInstant(false);
  }, [ex.firestoreId, ex.id, ex.thumbnail, ex.youtubeUrl]);

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

  const isYouTubePlaceholderThumb = (el: HTMLImageElement, url: string): boolean => {
    if (!url.includes('ytimg.com') && !url.includes('img.youtube.com/vi/')) return false;
    return el.naturalWidth > 0 && el.naturalWidth <= 120;
  };

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      const url = el.currentSrc || el.src;
      if (isYouTubePlaceholderThumb(el, url)) {
        clearSessionCoverUrl(ex.firestoreId, url);
        setImgLoaded(false);
        const nextIndex = fallbackIndexRef.current + 1;
        fallbackIndexRef.current = nextIndex;
        if (nextIndex < fallbacksRef.current.length) {
          setImgSrc(fallbacksRef.current[nextIndex]);
          return;
        }
        setImgLoaded(true);
        setImgSrc(CUSTOM_LOGO_URL);
        return;
      }
      setImgLoaded(true);
      setIsCoverInstant(true);
      if (url && !url.includes('imgur.com/rLLYQ3Z') && !isYouTubeCoverUrl(url)) {
        setSessionCoverUrl(ex.firestoreId, url);
      }
    },
    [ex.firestoreId]
  );

  return {
    imgSrc,
    imgLoaded,
    isCoverInstant,
    placeholderSrc,
    webpSrc,
    handleLoad,
    handleError,
    shouldUseCoverBlurUp: (reducedMotion: boolean) =>
      shouldUseCoverBlurUp(placeholderSrc, imgSrc, imgLoaded, reducedMotion),
  };
}
