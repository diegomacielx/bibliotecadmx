import { useState, useRef, useEffect, useCallback } from 'react';
import { buildGitHubCoverUrls } from '../lib/utils';
import { isOfficialGitHubCoverUrl } from '../lib/coverSource';
import {
  getSessionCoverUrl,
  isSessionCoverReady,
  setSessionCoverUrl,
  clearSessionCoverUrl,
} from '../lib/coverImageStore';

interface CoverSource {
  firestoreId: string;
  id: string;
  thumbnail?: string;
  youtubeUrl?: string;
}

const COVER_LOAD_TIMEOUT_MS = 7000;

export function useExerciseCover(ex: CoverSource) {
  const urlsRef = useRef(buildGitHubCoverUrls(ex));
  const indexRef = useRef(0);

  const resolveInitial = useCallback(() => {
    urlsRef.current = buildGitHubCoverUrls(ex);
    indexRef.current = 0;

    if (urlsRef.current.length === 0) {
      return { src: '', loaded: true, missing: true };
    }

    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isOfficialGitHubCoverUrl(sessionUrl)) {
      const idx = urlsRef.current.indexOf(sessionUrl);
      if (idx >= 0) indexRef.current = idx;
      const ready = isSessionCoverReady(ex.firestoreId);
      return { src: sessionUrl, loaded: ready, missing: false };
    }

    return { src: urlsRef.current[0] ?? '', loaded: false, missing: false };
  }, [ex]);

  const initial = resolveInitial();
  const [coverMissing, setCoverMissing] = useState(initial.missing);
  const [imgSrc, setImgSrc] = useState(initial.src);
  const [imgLoaded, setImgLoaded] = useState(initial.loaded);

  useEffect(() => {
    urlsRef.current = buildGitHubCoverUrls(ex);
    indexRef.current = 0;

    if (urlsRef.current.length === 0) {
      setCoverMissing(true);
      setImgSrc('');
      setImgLoaded(true);
      return;
    }

    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isOfficialGitHubCoverUrl(sessionUrl)) {
      const idx = urlsRef.current.indexOf(sessionUrl);
      indexRef.current = idx >= 0 ? idx : 0;
      setCoverMissing(false);
      setImgSrc(sessionUrl);
      setImgLoaded(isSessionCoverReady(ex.firestoreId));
      return;
    }

    setCoverMissing(false);
    setImgSrc(urlsRef.current[0] ?? '');
    setImgLoaded(false);
  }, [ex.firestoreId, ex.id]);

  const markMissing = useCallback(() => {
    setCoverMissing(true);
    setImgSrc('');
    setImgLoaded(true);
  }, []);

  const tryNextUrl = useCallback(() => {
    const next = indexRef.current + 1;
    indexRef.current = next;
    if (next < urlsRef.current.length) {
      setCoverMissing(false);
      setImgLoaded(false);
      setImgSrc(urlsRef.current[next] ?? '');
      return;
    }
    markMissing();
  }, [markMissing]);

  const handleError = useCallback(() => {
    if (imgSrc) clearSessionCoverUrl(ex.firestoreId, imgSrc);
    tryNextUrl();
  }, [ex.firestoreId, imgSrc, tryNextUrl]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const url = e.currentTarget.currentSrc || e.currentTarget.src;
      if (!isOfficialGitHubCoverUrl(url)) {
        handleError();
        return;
      }
      setCoverMissing(false);
      setImgLoaded(true);
      setSessionCoverUrl(ex.firestoreId, url);
    },
    [ex.firestoreId, handleError]
  );

  useEffect(() => {
    if (coverMissing || !imgSrc || imgLoaded) return;
    const timer = window.setTimeout(handleError, COVER_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [coverMissing, imgSrc, imgLoaded, handleError]);

  return {
    imgSrc,
    imgLoaded,
    isCoverInstant: imgLoaded,
    coverMissing,
    placeholderSrc: null,
    webpSrc: null,
    handleLoad,
    handleError,
    shouldUseCoverBlurUp: () => false,
  };
}
