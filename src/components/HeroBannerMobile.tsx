import { useEffect, useState } from 'react';
import { getCoverFrameStyle } from '../lib/coverFocus';
import { MOBILE_HERO_COLLAPSED_KEY, readMobileHeroCollapsed } from '../lib/mobilePreferences';
import { signalMobilePlaybackGesture } from '../lib/mobilePlaybackSession';
import { Icon } from './Icon';
import { useExerciseCover } from '../hooks/useExerciseCover';
import type { HeroDisplayContent } from '../lib/heroSpotlight';

interface HeroBannerMobileProps {
  hero: HeroDisplayContent;
  onWatch: (ex: import('../types').Exercise) => void;
  onCampaignClick?: (linkUrl: string, campaignId?: string) => void;
  onCampaignImpression?: (campaignId: string) => void;
  /** Layout compacto horizontal — padrão no mobile shell */
  variant?: 'default' | 'compact';
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
  variant = 'default',
}: HeroBannerMobileProps) {
  const isCampaign = hero.mode === 'campaign';
  const [collapsed, setCollapsed] = useState(() =>
    variant === 'compact' ? readMobileHeroCollapsed() : false
  );

  useEffect(() => {
    if (isCampaign && hero.campaignId) {
      onCampaignImpression?.(hero.campaignId);
    }
  }, [isCampaign, hero.campaignId, onCampaignImpression]);

  useEffect(() => {
    if (variant !== 'compact') return;
    localStorage.setItem(MOBILE_HERO_COLLAPSED_KEY, String(collapsed));
  }, [collapsed, variant]);

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
    if (hero.exercise) {
      signalMobilePlaybackGesture();
      onWatch(hero.exercise);
    }
  };

  if (variant === 'compact') {
    if (collapsed) {
      return (
        <article className="m-hero m-hero--compact m-hero--collapsed" data-testid="hero-mobile">
          <button
            type="button"
            className="m-hero__collapsed-bar"
            onClick={() => setCollapsed(false)}
            aria-expanded="false"
          >
            <span className="m-hero__collapsed-label">
              {isCampaign ? 'Patrocinado' : 'Destaque'}
            </span>
            <span className="m-hero__collapsed-title">{hero.title}</span>
            <Icon name="chevrondown" className="w-4 h-4 shrink-0 opacity-70" />
          </button>
        </article>
      );
    }

    return (
      <article className="m-hero m-hero--compact m-hero--stacked" data-testid="hero-mobile">
        <div className="m-hero__stacked-cover-wrap">
          <button
            type="button"
            className="m-hero__stacked-cover-btn"
            onClick={handleClick}
            aria-label={hero.ctaLabel}
          >
            <div className="m-hero__cover m-hero__cover--stacked" aria-hidden="true">
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
          </button>

          <button
            type="button"
            className="m-hero__collapse-btn m-hero__collapse-btn--overlay"
            onClick={() => setCollapsed(true)}
            aria-label="Recolher destaque"
            aria-expanded="true"
          >
            <Icon name="chevronup" className="w-4 h-4" />
          </button>
        </div>

        <div className="m-hero__stacked-body">
          <p className="m-hero__eyebrow m-hero__eyebrow--compact">
            <span className="m-hero__eyebrow-accent">{isCampaign ? 'Patrocinado' : 'Destaque'}</span>
            <span className="m-hero__eyebrow-sep" aria-hidden="true">
              ·
            </span>
            <span className="m-hero__eyebrow-cat">{hero.categoryLabel}</span>
          </p>
          <h2 className="m-hero__title m-hero__title--compact">{hero.title}</h2>
          <button type="button" className="m-hero__cta m-hero__cta--compact" onClick={handleClick}>
            <Icon name="play" className="w-3.5 h-3.5 ml-0.5" strokeWidth={2} />
            {hero.ctaLabel}
          </button>
        </div>
      </article>
    );
  }

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
