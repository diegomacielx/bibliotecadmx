import { useEffect } from 'react';
import { getCoverFrameStyle } from '../lib/coverFocus';
import { Icon } from './Icon';
import { useExerciseCover } from '../hooks/useExerciseCover';
import type { HeroDisplayContent } from '../lib/heroSpotlight';

interface HeroBannerMobileProps {
  hero: HeroDisplayContent;
  onWatch: (ex: import('../types').Exercise) => void;
  onCampaignClick?: (linkUrl: string, campaignId?: string) => void;
  onCampaignImpression?: (campaignId: string) => void;
}

/**
 * Destaque do dia — versão mobile isolada.
 * Sem Framer Motion, sem cinematic-card, sem animações de scroll.
 */
export function HeroBannerMobile({
  hero,
  onWatch,
  onCampaignClick,
  onCampaignImpression,
}: HeroBannerMobileProps) {
  const isCampaign = hero.mode === 'campaign';

  useEffect(() => {
    if (isCampaign && hero.campaignId) {
      onCampaignImpression?.(hero.campaignId);
    }
  }, [isCampaign, hero.campaignId, onCampaignImpression]);
  const coverSource = hero.exercise
    ? {
        firestoreId: hero.exercise.firestoreId,
        id: hero.exercise.id,
        thumbnail: hero.exercise.thumbnail,
        youtubeUrl: hero.exercise.youtubeUrl,
      }
    : {
        firestoreId: 'hero-campaign',
        id: 'hero',
        thumbnail: hero.imageUrl,
        youtubeUrl: '',
      };

  const { imgSrc, handleLoad, handleError } = useExerciseCover(coverSource, { priority: 'critical' });
  const displaySrc = isCampaign && hero.imageUrl ? hero.imageUrl : imgSrc;
  const frame = getCoverFrameStyle(hero.frameSource);

  const handleClick = () => {
    if (isCampaign && hero.linkUrl) {
      onCampaignClick?.(hero.linkUrl, hero.campaignId);
      return;
    }
    if (hero.exercise) onWatch(hero.exercise);
  };

  return (
    <article className="m-hero" data-testid="hero-mobile">
      <div className="m-hero__text-block">
        <p className="m-hero__eyebrow">
          <span className="m-hero__eyebrow-accent">{isCampaign ? 'Patrocinado' : 'Destaque do dia'}</span>
          <span className="m-hero__eyebrow-sep" aria-hidden="true">
            ·
          </span>
          <span className="m-hero__eyebrow-cat">{hero.categoryLabel}</span>
        </p>
        {hero.exerciseId && <p className="m-hero__id">#{hero.exerciseId}</p>}
        <h2 className="m-hero__title">{hero.title}</h2>
        <button type="button" className="m-hero__cta" onClick={handleClick}>
          <span className="m-hero__cta-icon" aria-hidden="true">
            <Icon name="play" className="w-4 h-4 ml-0.5" strokeWidth={2} />
          </span>
          {hero.ctaLabel}
        </button>
      </div>

      <div className="m-hero__cover" aria-hidden="true">
        <img
          src={displaySrc}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            objectPosition: frame.objectPosition,
            ...(frame.cssVars as React.CSSProperties),
          }}
          className="m-hero__cover-img"
        />
      </div>
    </article>
  );
}
