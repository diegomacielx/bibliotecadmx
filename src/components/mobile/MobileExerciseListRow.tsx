import type { Exercise } from '../../types';
import { useExerciseCover } from '../../hooks/useExerciseCover';
import { ExerciseCoverImage } from '../ExerciseCoverImage';
import { primeVideoPlaybackIntent } from '../../lib/videoPlaybackPrime';
import { MobileExerciseCardMenu } from './MobileExerciseCardMenu';

interface MobileExerciseListRowProps {
  ex: Exercise;
  index: number;
  onWatch: (ex: Exercise) => void;
  onDownload: (e: React.MouseEvent, ex: Exercise) => void;
  onCopyLink: () => void;
  copied?: boolean;
  selectionMode?: boolean;
  onTogglePlaylist?: (ex: Exercise) => void;
  playlistSequence?: number;
  isInPlaylist?: boolean;
}

export function MobileExerciseListRow({
  ex,
  index,
  onWatch,
  onDownload,
  onCopyLink,
  copied = false,
  selectionMode = false,
  onTogglePlaylist,
  playlistSequence,
  isInPlaylist = false,
}: MobileExerciseListRowProps) {
  const { imgSrc, imgLoaded, coverMissing, placeholderSrc, webpSrc, handleLoad, handleError } =
    useExerciseCover(ex, { priority: index < 12 ? 'high' : 'normal' });

  const openExercise = () => {
    if (selectionMode && onTogglePlaylist) {
      onTogglePlaylist(ex);
      return;
    }
    primeVideoPlaybackIntent(ex);
    onWatch(ex);
  };

  return (
    <article
      className={`mobile-exercise-row ${isInPlaylist ? 'mobile-exercise-row--playlist' : ''} ${
        selectionMode ? 'mobile-exercise-row--selection' : ''
      }`}
    >
      <div className="mobile-exercise-row__card">
        <button
          type="button"
          className="mobile-exercise-row__main"
          onClick={openExercise}
          aria-label={
            selectionMode
              ? `${ex.name} — toque para adicionar à playlist`
              : `${ex.name} — abrir exercício`
          }
        >
          <div className="mobile-exercise-row__thumb">
            <ExerciseCoverImage
              imgSrc={imgSrc}
              imgLoaded={imgLoaded}
              placeholderSrc={placeholderSrc}
              webpSrc={webpSrc}
              alt=""
              frameSource={ex}
              exerciseId={ex.id}
              exerciseCategory={ex.category}
              coverMissing={coverMissing}
              loading={index < 8 ? 'eager' : 'lazy'}
              fetchPriority={index < 8 ? 'high' : 'auto'}
              useBlurUp={false}
              onLoad={handleLoad}
              onError={handleError}
              imgClassName="mobile-exercise-row__img"
            />
            {selectionMode && playlistSequence != null && (
              <span className="mobile-exercise-row__sequence">{playlistSequence}</span>
            )}
          </div>

          <div className="mobile-exercise-row__body">
            <h3 className="mobile-exercise-row__title">{ex.name}</h3>
          </div>
        </button>

        {!selectionMode && (
          <MobileExerciseCardMenu
            variant="list"
            onDownload={(e) => onDownload(e, ex)}
            onCopyLink={(e) => {
              e.stopPropagation();
              onCopyLink();
            }}
            copied={copied}
          />
        )}
      </div>
    </article>
  );
}
