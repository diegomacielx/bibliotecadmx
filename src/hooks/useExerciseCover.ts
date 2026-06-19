import { useState, useEffect, useCallback } from 'react';
import { buildGitHubCoverUrls } from '../lib/utils';
import { isOfficialGitHubCoverUrl } from '../lib/coverSource';
import { resolveExerciseCoverUrl, type CoverPriority } from '../lib/coverResolver';
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

interface UseExerciseCoverOptions {
  priority?: CoverPriority;
}

export function useExerciseCover(ex: CoverSource, options: UseExerciseCoverOptions = {}) {
  const priority = options.priority ?? 'normal';

  const [coverMissing, setCoverMissing] = useState(() => buildGitHubCoverUrls(ex).length === 0);
  const [imgSrc, setImgSrc] = useState(() => {
    const urls = buildGitHubCoverUrls(ex);
    if (urls.length === 0) return '';
    const known = getSessionCoverUrl(ex.firestoreId);
    if (known && isOfficialGitHubCoverUrl(known)) return known;
    return '';
  });
  const [imgLoaded, setImgLoaded] = useState(() => {
    const known = getSessionCoverUrl(ex.firestoreId);
    return !!known && isSessionCoverReady(ex.firestoreId);
  });

  useEffect(() => {
    const urls = buildGitHubCoverUrls(ex);
    if (urls.length === 0) {
      setCoverMissing(true);
      setImgSrc('');
      setImgLoaded(true);
      return;
    }

    const known = getSessionCoverUrl(ex.firestoreId);
    if (known && isOfficialGitHubCoverUrl(known)) {
      setCoverMissing(false);
      setImgSrc(known);
      if (isSessionCoverReady(ex.firestoreId)) {
        setImgLoaded(true);
        return;
      }
      setImgLoaded(false);
    } else {
      setCoverMissing(false);
      setImgLoaded(false);
      setImgSrc('');
    }

    let cancelled = false;

    void resolveExerciseCoverUrl(ex, priority).then((url) => {
      if (cancelled) return;
      if (url) {
        setCoverMissing(false);
        setImgSrc(url);
      } else if (!known) {
        setCoverMissing(true);
        setImgSrc('');
        setImgLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ex.firestoreId, ex.id, priority]);

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
