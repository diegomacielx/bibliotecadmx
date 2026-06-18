import type { Exercise } from '../types';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverObjectPosition } from '../lib/coverFocus';
import { openYouTubeWatch } from '../lib/utils';
import { Icon } from '../components/Icon';

interface MobileCardProps {
  ex: Exercise;
  open: boolean;
  onToggle: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onCopy: () => void;
  copied: boolean;
  onDownload4K: () => void;
  selectionMode?: boolean;
  playlistSequence?: number;
  onTogglePlaylist?: () => void;
}

export function MobileCard({
  ex,
  open,
  onToggle,
  isFavorite,
  onToggleFavorite,
  onCopy,
  copied,
  onDownload4K,
  selectionMode,
  playlistSequence,
  onTogglePlaylist,
}: MobileCardProps) {
  const { imgSrc, handleLoad, handleError } = useExerciseCover(ex);

  const handleCoverTap = () => {
    if (selectionMode && onTogglePlaylist) {
      onTogglePlaylist();
      return;
    }
    onToggle();
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    openYouTubeWatch(ex.youtubeUrl);
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <article className={`m-card ${open ? 'm-card--open' : ''}`}>
      <div
        className="m-card-cover-wrap"
        role="button"
        tabIndex={0}
        onClick={handleCoverTap}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCoverTap();
          }
        }}
        aria-label={open ? `Ações: ${ex.name}` : `Expandir: ${ex.name}`}
        aria-expanded={open}
      >
        <img
          src={imgSrc}
          alt=""
          className="m-card-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
          style={{ objectPosition: getCoverObjectPosition(ex) }}
        />

        {selectionMode && playlistSequence != null && (
          <span className="m-card-order">{playlistSequence}</span>
        )}

        {!selectionMode && open && (
          <>
            <span className="m-card-id">#{ex.id}</span>
            <div className="m-card-actions">
              <button
                type="button"
                className={`m-card-act ${isFavorite ? 'm-card-act--on' : ''}`}
                aria-label="Favoritar"
                onClick={(e) => {
                  stop(e);
                  onToggleFavorite();
                }}
              >
                <Icon name="heart" className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                className="m-card-act"
                aria-label="Copiar link"
                onClick={(e) => {
                  stop(e);
                  onCopy();
                }}
              >
                <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="m-card-act"
                aria-label="Baixar 4K"
                onClick={(e) => {
                  stop(e);
                  onDownload4K();
                }}
              >
                <Icon name="download" className="w-4 h-4" />
              </button>
            </div>
            <button type="button" className="m-card-play" aria-label="Abrir no YouTube" onClick={handlePlay}>
              <Icon name="play" className="w-5 h-5 ml-0.5" />
            </button>
          </>
        )}
      </div>

      <div className="m-card-foot" onClick={handleCoverTap} role="presentation">
        <span className="m-card-cat">{ex.category}</span>
        <h3 className="m-card-name">{ex.name}</h3>
        {open && ex.muscleGroups && ex.muscleGroups.length > 0 && (
          <p className="m-card-muscles">{ex.muscleGroups.join(' · ')}</p>
        )}
      </div>
    </article>
  );
}
