import type { Exercise } from '../types';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverObjectPosition } from '../lib/coverFocus';
import { Icon } from './Icon';

interface HeroBannerMobileProps {
  ex: Exercise;
  onWatch: (ex: Exercise) => void;
  fromFavorites?: boolean;
}

/**
 * Destaque do dia — versão mobile isolada.
 * Sem Framer Motion, sem cinematic-card, sem animações de scroll.
 */
export function HeroBannerMobile({ ex, onWatch, fromFavorites }: HeroBannerMobileProps) {
  const { imgSrc, handleLoad, handleError } = useExerciseCover(ex);
  const eyebrow = fromFavorites ? 'Seu treino do dia' : 'Destaque do dia';

  return (
    <article className="m-hero" data-testid="hero-mobile">
      <div className="m-hero__text-block">
        <p className="m-hero__eyebrow">
          <span className="m-hero__eyebrow-accent">{eyebrow}</span>
          <span className="m-hero__eyebrow-sep" aria-hidden="true">
            ·
          </span>
          <span className="m-hero__eyebrow-cat">{ex.category}</span>
        </p>
        <p className="m-hero__id">#{ex.id}</p>
        <h2 className="m-hero__title">{ex.name}</h2>
        <button type="button" className="m-hero__cta" onClick={() => onWatch(ex)}>
          <span className="m-hero__cta-icon" aria-hidden="true">
            <Icon name="play" className="w-4 h-4 ml-0.5" strokeWidth={2} />
          </span>
          Assistir execução
        </button>
      </div>

      <div className="m-hero__cover" aria-hidden="true">
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
          style={{ objectPosition: getCoverObjectPosition(ex) }}
          className="m-hero__cover-img"
        />
      </div>
    </article>
  );
}
