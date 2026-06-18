import { useMemo } from 'react';
import { getCoverFrameStyle, type CoverFrameSource } from '../lib/coverFocus';
import { ExerciseCoverPlaceholder } from './ExerciseCoverPlaceholder';

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
  /** Capa indisponível no GitHub */
  coverMissing?: boolean;
  exerciseId?: string;
  exerciseCategory?: string;
  instantDisplay?: boolean;
  onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onError: () => void;
}

export function ExerciseCoverImage({
  imgSrc,
  imgLoaded,
  alt,
  frameSource,
  loading = 'lazy',
  className = '',
  imgClassName = '',
  coverMissing = false,
  exerciseId,
  exerciseCategory,
  instantDisplay = false,
  onLoad,
  onError,
}: ExerciseCoverImageProps) {
  const frame = useMemo(
    () =>
      frameSource
        ? getCoverFrameStyle(frameSource)
        : getCoverFrameStyle({ name: '', category: '', muscleGroups: [] }),
    [frameSource]
  );

  const showArt = coverMissing || !imgLoaded;
  const showImage = !coverMissing && !!imgSrc;
  const rootStyle = frame.cssVars as React.CSSProperties;
  const rootClass = `cover-image-root ${className}`.trim();

  return (
    <div className={rootClass} style={rootStyle}>
      {showArt && (
        <ExerciseCoverPlaceholder
          exerciseId={exerciseId}
          category={exerciseCategory}
          subdued={!coverMissing && !imgLoaded}
          className="cover-placeholder--in-card"
        />
      )}

      {showImage && (
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
      )}
    </div>
  );
}
