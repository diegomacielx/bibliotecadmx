import { useEffect } from 'react';
import type { Exercise } from '../types';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverObjectPosition } from '../lib/coverFocus';
import { normalizeMuscleGroups } from '../lib/muscleGroups';
import { openYouTubeWatch } from '../lib/utils';
import { Icon } from '../components/Icon';

interface MobileExerciseDetailProps {
  ex: Exercise;
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
  onDownload4K: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  navIndex: number;
  navTotal: number;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
}

export function MobileExerciseDetail({
  ex,
  onClose,
  onCopy,
  copied,
  onDownload4K,
  isFavorite,
  onToggleFavorite,
  navIndex,
  navTotal,
  onPrev,
  onNext,
  canPrev,
  canNext,
}: MobileExerciseDetailProps) {
  const { imgSrc, handleLoad, handleError } = useExerciseCover(ex);
  const muscles = normalizeMuscleGroups(ex.muscleGroups);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.documentElement.classList.add('m-detail-open');
    document.body.style.top = `-${scrollY}px`;
    return () => {
      document.documentElement.classList.remove('m-detail-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="m-detail" role="dialog" aria-modal="true" aria-labelledby="m-detail-title">
      <header className="m-detail-head">
        <button type="button" className="m-detail-back" onClick={onClose}>
          <Icon name="left" className="w-4 h-4" />
          Voltar
        </button>
      </header>

      <div className="m-detail-scroll">
        <p className="m-detail-kicker">
          #{ex.id} · {ex.category}
        </p>
        <h1 id="m-detail-title" className="m-detail-title">
          {ex.name}
        </h1>

        {muscles.length > 0 && (
          <>
            <p className="m-detail-muscles-title">Músculos</p>
            <ul className="m-detail-muscles">
              {muscles.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        )}

        <div className="m-detail-actions">
          <button type="button" className="m-detail-btn m-detail-btn--primary" onClick={onDownload4K}>
            <Icon name="download" className="w-4 h-4" />
            Baixar 4K
          </button>
          <button
            type="button"
            className={`m-detail-btn ${copied ? 'm-detail-btn--success' : ''}`}
            onClick={onCopy}
          >
            <Icon name={copied ? 'check' : 'copy'} className="w-4 h-4" />
            {copied ? 'Link copiado' : 'Copiar link do vídeo'}
          </button>
          <button type="button" className="m-detail-btn" onClick={onToggleFavorite}>
            <Icon name="heart" className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            {isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          </button>
        </div>

        <div className="m-detail-poster-wrap">
          <img
            src={imgSrc}
            alt=""
            className="m-detail-poster"
            loading="eager"
            onLoad={handleLoad}
            onError={handleError}
            style={{ objectPosition: getCoverObjectPosition(ex) }}
          />
        </div>

        <button
          type="button"
          className="m-detail-btn m-detail-btn--primary"
          onClick={() => openYouTubeWatch(ex.youtubeUrl)}
        >
          <Icon name="play" className="w-4 h-4" />
          Assistir no YouTube
        </button>

        {navTotal > 1 && (
          <div className="m-detail-nav">
            <button
              type="button"
              className="m-detail-nav-btn"
              onClick={onPrev}
              disabled={!canPrev}
              aria-label="Exercício anterior"
            >
              <Icon name="skipback" className="w-4 h-4" />
            </button>
            <span className="m-detail-nav-count">
              {navIndex + 1} / {navTotal}
            </span>
            <button
              type="button"
              className="m-detail-nav-btn"
              onClick={onNext}
              disabled={!canNext}
              aria-label="Próximo exercício"
            >
              <Icon name="skipforward" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
