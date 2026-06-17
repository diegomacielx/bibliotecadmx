import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import type { Exercise } from '../types';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getCoverObjectPosition } from '../lib/coverFocus';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { Icon } from './Icon';

interface HeroBannerProps {
  ex: Exercise;
  onWatch: (ex: Exercise) => void;
  fromFavorites?: boolean;
}

export function HeroBanner({ ex, onWatch, fromFavorites }: HeroBannerProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { imgSrc, handleLoad, handleError } = useExerciseCover(ex);
  const reducedMotion = useReducedMotion();

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

  return (
    <section ref={sectionRef} className="hero-scroll-section w-full mb-fluid-lg px-0">
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-fluid-md lg:gap-fluid-lg items-center min-h-[280px] lg:min-h-[380px]">
        <motion.div
          {...textMotion}
          style={reducedMotion ? undefined : { opacity: textOpacity, y: textY }}
          className="lg:col-span-5 xl:col-span-5 flex flex-col justify-center order-2 lg:order-1 px-1 lg:px-0 z-10"
        >
          <p className="hero-featured-label mb-3">
            <span className="hero-featured-label-main">
              {fromFavorites ? 'Seu treino do dia' : 'Destaque do dia'}
            </span>
            <span className="hero-featured-label-sep" aria-hidden="true">
              ·
            </span>
            <span className="hero-featured-label-category">{ex.category}</span>
          </p>

          <p className="text-2xs font-medium text-zinc-500 mb-2 tabular-nums">#{ex.id}</p>

          <h1 className="font-display text-3xl md:text-4xl xl:text-5xl font-semibold tracking-cinematic leading-title text-white mb-6">
            {ex.name}
          </h1>

          <motion.button
            type="button"
            onClick={() => onWatch(ex)}
            whileHover={reducedMotion ? undefined : { scale: 1.02 }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            className="hero-cta group self-start"
          >
            <span className="hero-cta-icon">
              <Icon name="play" className="w-4 h-4 ml-0.5" strokeWidth={2} />
            </span>
            Assistir execução
          </motion.button>
        </motion.div>

        <div className="lg:col-span-7 xl:col-span-7 order-1 lg:order-2 relative w-full">
          <button
            type="button"
            onClick={() => onWatch(ex)}
            aria-label={`Assistir ${ex.name}`}
            className="cinematic-card hero-cover-wrap relative w-full aspect-hero rounded-cinema-lg overflow-hidden group cursor-pointer border border-white/5 shadow-cinematic-lg hover:border-white/10 hover:shadow-cinematic-red ease-cinematic duration-cinematic"
          >
            <motion.img
              src={imgSrc}
              alt={ex.name}
              loading="eager"
              decoding="async"
              onLoad={handleLoad}
              onError={handleError}
              style={{
                objectPosition: getCoverObjectPosition(ex),
                ...(reducedMotion ? {} : { scale: imageScale, x: imageX }),
              }}
              className="absolute inset-0 w-full h-full object-cover ease-cinematic duration-cinematic origin-center"
            />

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
