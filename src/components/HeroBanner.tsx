import { useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Exercise } from '../types';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTouchLayout } from '../hooks/useMediaQuery';
import { Icon } from './Icon';
import { HeroBannerMobile } from './HeroBannerMobile';
import { ExerciseCoverImage } from './ExerciseCoverImage';
import type { HeroDisplayContent } from '../lib/heroSpotlight';

interface HeroBannerProps {
  hero: HeroDisplayContent;
  onWatch: (ex: Exercise) => void;
  onCampaignClick?: (linkUrl: string) => void;
}

function HeroBannerDesktop({ hero, onWatch, onCampaignClick }: HeroBannerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const enableScrollFx = !reducedMotion;
  const isCampaign = hero.mode === 'campaign';

  const coverSource = useMemo(
    () =>
      hero.exercise
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
          },
    [hero.exercise, hero.imageUrl]
  );

  const { imgSrc, imgLoaded, placeholderSrc, webpSrc, handleLoad, handleError } =
    useExerciseCover(coverSource);

  const displaySrc = isCampaign && hero.imageUrl ? hero.imageUrl : imgSrc;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const imageX = useTransform(scrollYProgress, [0, 1], [0, -20]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const textY = useTransform(scrollYProgress, [0, 0.45], [0, -32]);

  const textMotion = reducedMotion
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
      };

  const handleCoverClick = () => {
    if (isCampaign && hero.linkUrl) {
      onCampaignClick?.(hero.linkUrl);
      return;
    }
    if (hero.exercise) onWatch(hero.exercise);
  };

  return (
    <section ref={sectionRef} className="hero-scroll-section w-full mb-fluid-lg px-0">
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-fluid-md lg:gap-fluid-lg items-center min-h-[280px] lg:min-h-[380px]">
        <motion.div
          {...textMotion}
          style={enableScrollFx ? { opacity: textOpacity, y: textY } : undefined}
          className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center order-2 lg:order-1 px-1 lg:px-0 z-10"
        >
          <p className="hero-featured-label mb-3">
            <span className="hero-featured-label-main">
              {isCampaign ? 'Outdoor' : 'Destaque do dia'}
            </span>
            <span className="hero-featured-label-sep" aria-hidden="true">
              ·
            </span>
            <span className="hero-featured-label-category">{hero.categoryLabel}</span>
          </p>

          {hero.exerciseId && <p className="hero-exercise-id mb-3">#{hero.exerciseId}</p>}

          <h1 className="hero-title mb-6">{hero.title}</h1>

          {hero.subtitle && <p className="hero-subtitle mb-4 text-white/70">{hero.subtitle}</p>}

          <motion.button
            type="button"
            onClick={handleCoverClick}
            whileHover={reducedMotion ? undefined : { scale: 1.02 }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            className="hero-cta group self-start"
          >
            <span className="hero-cta-icon">
              <Icon name="play" className="w-4 h-4 ml-0.5" strokeWidth={2} />
            </span>
            {hero.ctaLabel}
          </motion.button>
        </motion.div>

        <div className="lg:col-span-7 xl:col-span-7 order-1 lg:order-2 relative w-full">
          <button
            type="button"
            onClick={handleCoverClick}
            aria-label={isCampaign ? hero.title : `Assistir ${hero.title}`}
            className="cinematic-card hero-cover-wrap card-catalog-cover relative w-full aspect-hero rounded-cinema-lg overflow-hidden group cursor-pointer border border-white/5 shadow-cinematic-lg hover:border-white/10 hover:shadow-cinematic-red ease-cinematic duration-cinematic"
          >
            <motion.div
              style={{
                ...(enableScrollFx ? { scale: imageScale, x: imageX } : {}),
              }}
              className="absolute inset-0 ease-cinematic duration-cinematic origin-center pointer-events-none select-none"
            >
              <ExerciseCoverImage
                imgSrc={displaySrc}
                imgLoaded={isCampaign ? true : imgLoaded}
                placeholderSrc={isCampaign ? null : placeholderSrc}
                webpSrc={isCampaign ? null : webpSrc}
                alt={hero.title}
                frameSource={hero.frameSource}
                loading="eager"
                useBlurUp={!isCampaign && !reducedMotion}
                onLoad={handleLoad}
                onError={handleError}
                imgClassName="card-cover-img"
              />
            </motion.div>

            <div className="card-cover-grain" aria-hidden="true" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 ease-cinematic duration-cinematic pointer-events-none">
              <span className="card-play-ring">
                <Icon name="play" className="w-5 h-5 text-white ml-0.5" strokeWidth={2} />
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}

export function HeroBanner(props: HeroBannerProps) {
  const touchLayout = useTouchLayout();
  if (touchLayout) return <HeroBannerMobile {...props} />;
  return <HeroBannerDesktop {...props} />;
}
