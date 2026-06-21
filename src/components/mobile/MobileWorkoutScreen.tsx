import type { Exercise } from '../../types';
import { useExerciseCover } from '../../hooks/useExerciseCover';
import { ExerciseCoverImage } from '../ExerciseCoverImage';
import { Icon } from '../Icon';

interface MobileWorkoutScreenProps {
  playlist: Exercise[];
  onPlay: () => void;
  onClear: () => void;
  onAddExercises: () => void;
  onWatch: (ex: Exercise) => void;
  onRemoveFromPlaylist: (ex: Exercise) => void;
}

function WorkoutRow({
  ex,
  sequence,
  onWatch,
  onRemove,
}: {
  ex: Exercise;
  sequence: number;
  onWatch: () => void;
  onRemove: () => void;
}) {
  const { imgSrc, imgLoaded, coverMissing, placeholderSrc, webpSrc, handleLoad, handleError } =
    useExerciseCover(ex, { priority: 'normal' });

  return (
    <article className="mobile-workout-row">
      <button type="button" className="mobile-workout-row__main" onClick={onWatch}>
        <span className="mobile-workout-row__sequence">{sequence}</span>
        <div className="mobile-workout-row__thumb">
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
            loading="lazy"
            useBlurUp={false}
            onLoad={handleLoad}
            onError={handleError}
            imgClassName="mobile-workout-row__img"
          />
        </div>
        <span className="mobile-workout-row__title">{ex.name}</span>
      </button>
      <button
        type="button"
        className="mobile-workout-row__remove"
        onClick={onRemove}
        aria-label={`Remover ${ex.name} do treino`}
      >
        <Icon name="x" className="w-4 h-4" />
      </button>
    </article>
  );
}

export function MobileWorkoutScreen({
  playlist,
  onPlay,
  onClear,
  onAddExercises,
  onWatch,
  onRemoveFromPlaylist,
}: MobileWorkoutScreenProps) {
  const count = playlist.length;

  return (
    <div className="mobile-workout-screen">
      <header className="mobile-tab-heading cinema-container mb-fluid-md">
        <h2 className="mobile-tab-heading__title">Meu treino</h2>
        <p className="mobile-tab-heading__meta">
          {count === 0
            ? 'Monte uma sequência e reproduza em ordem'
            : `${count} ${count === 1 ? 'exercício na fila' : 'exercícios na fila'}`}
        </p>
      </header>

      {count === 0 ? (
        <div className="mobile-workout-screen__empty">
          <span className="mobile-workout-screen__empty-icon" aria-hidden="true">
            <Icon name="listvideo" className="w-9 h-9" strokeWidth={1.25} />
          </span>
          <p className="mobile-workout-screen__empty-title">Nenhum exercício no treino</p>
          <p className="mobile-workout-screen__empty-desc">
            Adicione exercícios do catálogo na ordem que você quer executar.
          </p>
          <button type="button" className="mobile-workout-screen__cta" onClick={onAddExercises}>
            Montar treino
          </button>
        </div>
      ) : (
        <>
          <div className="mobile-workout-screen__actions cinema-container">
            <button type="button" className="mobile-workout-screen__btn mobile-workout-screen__btn--ghost" onClick={onClear}>
              Limpar
            </button>
            <button type="button" className="mobile-workout-screen__btn mobile-workout-screen__btn--primary" onClick={onPlay}>
              <Icon name="play" className="w-4 h-4" fill="currentColor" />
              Iniciar treino
            </button>
          </div>
          <ul className="mobile-workout-screen__list cinema-container">
            {playlist.map((ex, index) => (
              <li key={ex.firestoreId}>
                <WorkoutRow
                  ex={ex}
                  sequence={index + 1}
                  onWatch={() => onWatch(ex)}
                  onRemove={() => onRemoveFromPlaylist(ex)}
                />
              </li>
            ))}
          </ul>
          <div className="mobile-workout-screen__footer cinema-container">
            <button type="button" className="mobile-workout-screen__add-btn" onClick={onAddExercises}>
              <Icon name="plus" className="w-4 h-4" />
              Adicionar exercícios
            </button>
          </div>
        </>
      )}
    </div>
  );
}
