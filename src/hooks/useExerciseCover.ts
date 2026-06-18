import { useState, useRef, useEffect, useCallback } from 'react';
import {
  buildExerciseImageFallbacks,
  isGenericCoverFallbackUrl,
  isYouTubeCoverUrl,
} from '../lib/utils';
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

function markCoverMissing(
  setCoverMissing: (v: boolean) => void,
  setImgSrc: (v: string) => void,
  setImgLoaded: (v: boolean) => void,
  setIsCoverInstant: (v: boolean) => void
) {
  setCoverMissing(true);
  setImgSrc('');
  setImgLoaded(true);
  setIsCoverInstant(true);
}

export function useExerciseCover(ex: CoverSource) {
  const fallbacksRef = useRef(buildExerciseImageFallbacks(ex));
  const fallbackIndexRef = useRef(0);

  const resolveInitial = useCallback(() => {
    fallbacksRef.current = buildExerciseImageFallbacks(ex);
    if (fallbacksRef.current.length === 0) {
      return { src: '', loaded: true, missing: true };
    }

    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isGenericCoverFallbackUrl(sessionUrl)) {
      clearSessionCoverUrl(ex.firestoreId, sessionUrl);
    } else if (sessionUrl && isSessionCoverReady(ex.firestoreId)) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      return { src: sessionUrl, loaded: true, missing: false };
    } else if (sessionUrl) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      const fromDisk = getCachedCoverUrl(ex.firestoreId) === sessionUrl;
      return { src: sessionUrl, loaded: fromDisk, missing: false };
    }

    fallbackIndexRef.current = 0;
    return {
      src: fallbacksRef.current[0] ?? '',
      loaded: false,
      missing: false,
    };
  }, [ex]);

  const initial = resolveInitial();
  const [coverMissing, setCoverMissing] = useState(initial.missing);
  const [imgSrc, setImgSrc] = useState(initial.src);
  const [imgLoaded, setImgLoaded] = useState(initial.loaded);
  const [isCoverInstant, setIsCoverInstant] = useState(
    initial.missing ||
      isSessionCoverReady(ex.firestoreId) ||
      (initial.loaded && getCachedCoverUrl(ex.firestoreId) === initial.src)
  );

  const placeholderSrc = coverMissing ? null : getCoverPlaceholderUrl(ex);
  const webpSrc = coverMissing ? null : getCoverWebpCompanion(imgSrc);

  useEffect(() => {
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    fallbacksRef.current = buildExerciseImageFallbacks(ex);

    if (fallbacksRef.current.length === 0) {
      markCoverMissing(setCoverMissing, setImgSrc, setImgLoaded, setIsCoverInstant);
      return;
    }

    if (sessionUrl && isGenericCoverFallbackUrl(sessionUrl)) {
      clearSessionCoverUrl(ex.firestoreId, sessionUrl);
    } else if (sessionUrl && isSessionCoverReady(ex.firestoreId)) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      setCoverMissing(false);
      setImgSrc(sessionUrl);
      setImgLoaded(true);
      setIsCoverInstant(true);
      return;
    }

    if (sessionUrl && !isGenericCoverFallbackUrl(sessionUrl)) {
      const idx = fallbacksRef.current.indexOf(sessionUrl);
      fallbackIndexRef.current = idx >= 0 ? idx : 0;
      setCoverMissing(false);
      setImgSrc(sessionUrl);
      const cachedHit = getCachedCoverUrl(ex.firestoreId) === sessionUrl;
      setImgLoaded(isSessionCoverReady(ex.firestoreId) || cachedHit);
      setIsCoverInstant(isSessionCoverReady(ex.firestoreId) || cachedHit);
      return;
    }

    fallbackIndexRef.current = 0;
    setCoverMissing(false);
    setImgSrc(fallbacksRef.current[0] ?? '');
    setImgLoaded(false);
    setIsCoverInstant(false);
  }, [ex.firestoreId, ex.id, ex.thumbnail, ex.youtubeUrl]);

  const advanceFallback = useCallback(() => {
    const nextIndex = fallbackIndexRef.current + 1;
    fallbackIndexRef.current = nextIndex;
    if (nextIndex < fallbacksRef.current.length) {
      setCoverMissing(false);
      setImgLoaded(isSessionCoverReady(ex.firestoreId));
      setImgSrc(fallbacksRef.current[nextIndex]);
      return true;
    }
    markCoverMissing(setCoverMissing, setImgSrc, setImgLoaded, setIsCoverInstant);
    return false;
  }, [ex.firestoreId]);

  const handleError = useCallback(() => {
    clearSessionCoverUrl(ex.firestoreId, imgSrc);
    setImgLoaded(false);
    advanceFallback();
  }, [ex.firestoreId, imgSrc, advanceFallback]);

  const isYouTubePlaceholderThumb = (el: HTMLImageElement, url: string): boolean => {
    if (!url.includes('ytimg.com') && !url.includes('img.youtube.com/vi/')) return false;
    return el.naturalWidth > 0 && el.naturalWidth <= 120;
  };

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      const url = el.currentSrc || el.src;
      if (isGenericCoverFallbackUrl(url)) {
        clearSessionCoverUrl(ex.firestoreId, url);
        advanceFallback();
        return;
      }
      if (isYouTubePlaceholderThumb(el, url)) {
        clearSessionCoverUrl(ex.firestoreId, url);
        setImgLoaded(false);
        advanceFallback();
        return;
      }
      setCoverMissing(false);
      setImgLoaded(true);
      setIsCoverInstant(true);
      if (url && !isYouTubeCoverUrl(url)) {
        setSessionCoverUrl(ex.firestoreId, url);
      }
    },
    [ex.firestoreId, advanceFallback]
  );

  return {
    imgSrc,
    imgLoaded,
    isCoverInstant,
    coverMissing,
    placeholderSrc,
    webpSrc,
    handleLoad,
    handleError,
    shouldUseCoverBlurUp: (reducedMotion: boolean) =>
      !coverMissing && shouldUseCoverBlurUp(placeholderSrc, imgSrc, imgLoaded, reducedMotion),
  };
}
