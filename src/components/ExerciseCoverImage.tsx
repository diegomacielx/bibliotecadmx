import { useMemo } from 'react';
import { Skeleton } from './Skeleton';
import { getCoverFrameStyle, type CoverFrameSource } from '../lib/coverFocus';

interface ExerciseCoverImageProps {
  imgSrc: string;
  imgLoaded: boolean;
  placeholderSrc?: string | null;
  webpSrc?: string | null;
  alt: string;
  frameSource?: CoverFrameSource;
  loading?: 'lazy' | 'eager';
  className?: string;
  imgClassName?: string;
  useBlurUp?: boolean;
  /** Capa já resolvida nesta sessão — exibe sem fade-in */
  instantDisplay?: boolean;
  onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError: () => void;
}

export function ExerciseCoverImage({
  imgSrc,
  imgLoaded,
  placeholderSrc,
  webpSrc,
  alt,
  frameSource,
  loading = 'lazy',
  className = '',
  imgClassName = '',
  useBlurUp = false,
  instantDisplay = false,
  onLoad,
  onError,
}: ExerciseCoverImageProps) {
  const frame = useMemo(
    () => (frameSource ? getCoverFrameStyle(frameSource) : getCoverFrameStyle({ name: '', category: '', muscleGroups: [] })),
    [frameSource]
  );

  const showPlaceholder = useBlurUp && !imgLoaded && placeholderSrc;
  const showSkeleton = !imgLoaded && !showPlaceholder;
  const rootStyle = frame.cssVars as React.CSSProperties;
  const rootClass = `cover-image-root ${className}`.trim();

  return (
    <div className={rootClass} style={rootStyle}>
      {showSkeleton && (
        <div className="cover-image-skeleton" aria-hidden="true">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      )}

      {showPlaceholder && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
          className={`cover-image-placeholder ${imgLoaded ? 'cover-image-placeholder--hidden' : ''}`}
          style={{ objectPosition: frame.objectPosition }}
        />
      )}

      <picture className="cover-image-picture">
        {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
        <img
          src={imgSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={onLoad}
          onError={onError}
          className={`cover-image-main ${imgLoaded || instantDisplay ? 'cover-image-main--loaded' : ''} ${instantDisplay ? 'cover-image-main--instant' : ''} ${imgClassName}`.trim()}
          style={{ objectPosition: frame.objectPosition }}
        />
      </picture>
    </div>
  );
}
