import { useState, useEffect, useCallback } from 'react';
import { buildGitHubCoverUrls } from '../lib/utils';
import { isOfficialGitHubCoverUrl } from '../lib/coverSource';
import { resolveExerciseCoverUrl } from '../lib/coverResolver';
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

export function useExerciseCover(ex: CoverSource) {
  const [coverMissing, setCoverMissing] = useState(() => buildGitHubCoverUrls(ex).length === 0);
  const [imgSrc, setImgSrc] = useState(() => {
    const urls = buildGitHubCoverUrls(ex);
    if (urls.length === 0) return '';
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isOfficialGitHubCoverUrl(sessionUrl)) return sessionUrl;
    return '';
  });
  const [imgLoaded, setImgLoaded] = useState(() => {
    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    return !!sessionUrl && isSessionCoverReady(ex.firestoreId);
  });

  useEffect(() => {
    const urls = buildGitHubCoverUrls(ex);
    if (urls.length === 0) {
      setCoverMissing(true);
      setImgSrc('');
      setImgLoaded(true);
      return;
    }

    const sessionUrl = getSessionCoverUrl(ex.firestoreId);
    if (sessionUrl && isOfficialGitHubCoverUrl(sessionUrl) && isSessionCoverReady(ex.firestoreId)) {
      setCoverMissing(false);
      setImgSrc(sessionUrl);
      setImgLoaded(true);
      return;
    }

    let cancelled = false;
    setCoverMissing(false);
    setImgLoaded(false);
    setImgSrc('');

    void resolveExerciseCoverUrl(ex).then((url) => {
      if (cancelled) return;
      if (url) {
        setCoverMissing(false);
        setImgSrc(url);
      } else {
        setCoverMissing(true);
        setImgSrc('');
        setImgLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ex.firestoreId, ex.id]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const url = e.currentTarget.currentSrc || e.currentTarget.src;
      if (!isOfficialGitHubCoverUrl(url)) {
        clearSessionCoverUrl(ex.firestoreId, url);
        setCoverMissing(true);
        setImgSrc('');
        setImgLoaded(true);
        return;
      }
      setCoverMissing(false);
      setImgLoaded(true);
      setSessionCoverUrl(ex.firestoreId, url);
    },
    [ex.firestoreId]
  );

  const handleError = useCallback(() => {
    if (imgSrc) clearSessionCoverUrl(ex.firestoreId, imgSrc);
    setCoverMissing(true);
    setImgSrc('');
    setImgLoaded(true);
  }, [ex.firestoreId, imgSrc]);

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
