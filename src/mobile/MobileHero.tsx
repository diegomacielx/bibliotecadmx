import type { Exercise } from '../types';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverObjectPosition } from '../lib/coverFocus';
import { Icon } from '../components/Icon';

interface MobileHeroProps {
  ex: Exercise;
  fromFavorites?: boolean;
  onOpenDetail: () => void;
}

export function MobileHero({ ex, fromFavorites, onOpenDetail }: MobileHeroProps) {
  const { imgSrc, handleLoad, handleError } = useExerciseCover(ex);
  const label = fromFavorites ? 'Seu treino do dia' : 'Destaque do dia';

  return (
    <section className="m-hero-block">
      <p className="m-hero-label">
        {label} · {ex.category}
      </p>
      <p className="m-hero-id">#{ex.id}</p>
      <h2 className="m-hero-title">{ex.name}</h2>
      <button type="button" className="m-hero-btn" onClick={onOpenDetail}>
        <Icon name="play" className="w-4 h-4" />
        Assistir execução
      </button>
      <img
        src={imgSrc}
        alt=""
        className="m-hero-cover"
        loading="eager"
        decoding="async"
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
        style={{ objectPosition: getCoverObjectPosition(ex) }}
      />
    </section>
  );
}
