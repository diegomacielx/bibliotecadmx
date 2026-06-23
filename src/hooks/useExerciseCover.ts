import { useState, useEffect, useCallback, useRef } from 'react';
import { buildGitHubCoverUrls, getYouTubeId } from '../lib/utils';
import { isOfficialGitHubCoverUrl } from '../lib/coverSource';
import { resolveExerciseCoverUrl, type CoverPriority } from '../lib/coverResolver';
import {
  getSessionCoverUrl,
  isSessionCoverReady,
  setSessionCoverUrl,
  clearSessionCoverUrl,
} from '../lib/coverImageStore';
import { ensureCoverCached } from '../lib/coverImageCache';
import { getCoverPlaceholderUrl } from '../lib/coverImage';
import { clearGitHubCoverProbeCache } from '../lib/githubCoverProbe';

interface CoverSource {
  firestoreId: string;
  id: string;
  thumbnail?: string;
  youtubeUrl?: string;
}

interface UseExerciseCoverOptions {
  priority?: CoverPriority;
}

function buildYouTubeFallbackUrl(ex: CoverSource): string | null {
  const ytId = getYouTubeId(ex.youtubeUrl);
  if (!ytId) return null;
  return `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
}

function initialPlaceholder(ex: CoverSource): string {
  return getCoverPlaceholderUrl(ex) || buildYouTubeFallbackUrl(ex) || '';
}

export function useExerciseCover(ex: CoverSource, options: UseExerciseCoverOptions = {}) {
  const priority = options.priority ?? 'normal';
  const retryCountRef = useRef(0);

  const [coverMissing, setCoverMissing] = useState(() => {
    const urls = buildGitHubCoverUrls(ex);
    return urls.length === 0 && !buildYouTubeFallbackUrl(ex);
  });
  const [imgSrc, setImgSrc] = useState(() => {
    const urls = buildGitHubCoverUrls(ex);
    if (urls.length === 0) return initialPlaceholder(ex);
    const known = getSessionCoverUrl(ex.firestoreId);
    if (known && isOfficialGitHubCoverUrl(known)) return known;
    return initialPlaceholder(ex);
  });
  const [imgLoaded, setImgLoaded] = useState(() => {
    const known = getSessionCoverUrl(ex.firestoreId);
    return !!known && isSessionCoverReady(ex.firestoreId);
  });

  useEffect(() => {
    retryCountRef.current = 0;
  }, [ex.firestoreId, ex.id]);

  useEffect(() => {
    const urls = buildGitHubCoverUrls(ex);
    const fallback = initialPlaceholder(ex);

    if (urls.length === 0) {
      setCoverMissing(!fallback);
      setImgSrc(fallback);
      setImgLoaded(!!fallback);
      return;
    }

    const known = getSessionCoverUrl(ex.firestoreId);
    if (known && isOfficialGitHubCoverUrl(known)) {
      setCoverMissing(false);
      setImgSrc(known);
      if (isSessionCoverReady(ex.firestoreId)) {
        setImgLoaded(true);
      } else {
        setImgLoaded(false);
      }
    } else {
      setCoverMissing(false);
      setImgLoaded(false);
      setImgSrc(fallback || '');
    }

    let cancelled = false;

    void resolveExerciseCoverUrl(ex, priority).then((url) => {
      if (cancelled) return;
      if (url) {
        setCoverMissing(false);
        setImgSrc(url);
        return;
      }
      if (!known) {
        const ytFallback = buildYouTubeFallbackUrl(ex);
        if (ytFallback) {
          setCoverMissing(false);
          setImgSrc(ytFallback);
        } else {
          setCoverMissing(true);
          setImgSrc('');
          setImgLoaded(true);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ex.firestoreId, ex.id, priority]);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const url = e.currentTarget.currentSrc || e.currentTarget.src;
      if (isOfficialGitHubCoverUrl(url)) {
        setCoverMissing(false);
        setImgLoaded(true);
        setSessionCoverUrl(ex.firestoreId, url);
        void ensureCoverCached(url);
        return;
      }
      setCoverMissing(false);
      setImgLoaded(true);
    },
    [ex.firestoreId]
  );

  const handleError = useCallback(() => {
    const fallback = buildYouTubeFallbackUrl(ex);

    if (imgSrc && isOfficialGitHubCoverUrl(imgSrc)) {
      clearSessionCoverUrl(ex.firestoreId, imgSrc);
      if (fallback) {
        setCoverMissing(false);
        setImgSrc(fallback);
        setImgLoaded(false);
        return;
      }
      if (retryCountRef.current < 1) {
        retryCountRef.current += 1;
        clearGitHubCoverProbeCache();
        void resolveExerciseCoverUrl(ex, priority).then((url) => {
          if (url) {
            setCoverMissing(false);
            setImgSrc(url);
            setImgLoaded(false);
            return;
          }
          if (fallback) {
            setCoverMissing(false);
            setImgSrc(fallback);
            setImgLoaded(false);
            return;
          }
          setCoverMissing(true);
          setImgSrc('');
          setImgLoaded(true);
        });
        return;
      }
    }

    if (fallback && imgSrc !== fallback) {
      setCoverMissing(false);
      setImgSrc(fallback);
      setImgLoaded(false);
      return;
    }

    setCoverMissing(true);
    setImgSrc('');
    setImgLoaded(true);
  }, [ex, ex.firestoreId, imgSrc, priority]);

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
