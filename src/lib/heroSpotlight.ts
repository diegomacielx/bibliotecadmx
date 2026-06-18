import type { Exercise, HeroSpotlightSettings } from '../types';
import { pickDailyFeaturedExercise } from './search';
import { hasValidYouTubeUrl } from './utils';
import type { CoverFrameSource } from './coverFocus';

export type HeroDisplayMode = 'daily' | 'exercise' | 'campaign';

export interface HeroDisplayContent {
  mode: HeroDisplayMode;
  title: string;
  subtitle?: string;
  categoryLabel: string;
  exerciseId?: string;
  imageUrl?: string;
  youtubeUrl?: string;
  linkUrl?: string;
  ctaLabel: string;
  frameSource: CoverFrameSource;
  exercise?: Exercise;
}

const DEFAULT_CTA = 'Assistir execução';

function frameFromSpotlight(
  spot: HeroSpotlightSettings | undefined,
  fallback: CoverFrameSource
): CoverFrameSource {
  if (!spot) return fallback;
  return {
    ...fallback,
    coverFocusX: spot.coverFocusX ?? fallback.coverFocusX,
    coverFocusY: spot.coverFocusY ?? fallback.coverFocusY,
    coverZoom: spot.coverZoom ?? fallback.coverZoom,
  };
}

export function resolveHeroDisplay(
  exercises: Exercise[],
  spotlight: HeroSpotlightSettings | undefined
): HeroDisplayContent | null {
  const mode = spotlight?.mode ?? 'daily';

  if (mode === 'campaign' && spotlight?.imageUrl?.trim()) {
    const title = spotlight.title?.trim() || 'Destaque';
    return {
      mode: 'campaign',
      title,
      subtitle: spotlight.subtitle?.trim(),
      categoryLabel: spotlight.categoryLabel?.trim() || 'Outdoor',
      imageUrl: spotlight.imageUrl.trim(),
      linkUrl: spotlight.linkUrl?.trim(),
      ctaLabel: spotlight.ctaLabel?.trim() || 'Saiba mais',
      frameSource: {
        name: title,
        category: spotlight.categoryLabel || '',
        muscleGroups: [],
        coverFocusX: spotlight.coverFocusX,
        coverFocusY: spotlight.coverFocusY,
        coverZoom: spotlight.coverZoom,
      },
    };
  }

  if (mode === 'exercise' && spotlight?.exerciseFirestoreId) {
    const ex = exercises.find((item) => item.firestoreId === spotlight.exerciseFirestoreId);
    if (ex) {
      return {
        mode: 'exercise',
        title: ex.name,
        categoryLabel: ex.category,
        exerciseId: ex.id,
        youtubeUrl: ex.youtubeUrl,
        ctaLabel: DEFAULT_CTA,
        frameSource: frameFromSpotlight(spotlight, ex),
        exercise: ex,
      };
    }
  }

  const pool = exercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl));
  const daily = pickDailyFeaturedExercise(pool);
  if (!daily) return null;

  return {
    mode: 'daily',
    title: daily.name,
    categoryLabel: daily.category,
    exerciseId: daily.id,
    youtubeUrl: daily.youtubeUrl,
    ctaLabel: DEFAULT_CTA,
    frameSource: frameFromSpotlight(spotlight, daily),
    exercise: daily,
  };
}

export const DEFAULT_HERO_SPOTLIGHT: HeroSpotlightSettings = {
  mode: 'daily',
};
