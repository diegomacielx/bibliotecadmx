import type { Exercise, HeroSpotlightSettings } from '../types';
import { pickDailyFeaturedExercise } from './search';
import { hasValidYouTubeUrl } from './utils';
import type { CoverFrameSource } from './coverFocus';
import {
  campaignToDisplayFields,
  getActiveCampaigns,
  normalizeHeroSpotlight,
  pickCampaignForDisplay,
} from './heroCampaign';

export type HeroDisplayMode = 'daily' | 'exercise' | 'campaign';

export interface HeroDisplayContent {
  mode: HeroDisplayMode;
  /** ID da campanha veiculada (modo campaign) */
  campaignId?: string;
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

function resolveDailyOrExercise(
  exercises: Exercise[],
  spotlight: HeroSpotlightSettings
): HeroDisplayContent | null {
  const mode = spotlight.mode ?? 'daily';

  if (mode === 'exercise' && spotlight.exerciseFirestoreId) {
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

export function resolveHeroDisplay(
  exercises: Exercise[],
  rawSpotlight: HeroSpotlightSettings | undefined
): HeroDisplayContent | null {
  const spotlight = normalizeHeroSpotlight(rawSpotlight);
  const mode = spotlight.mode ?? 'daily';

  if (mode === 'campaign') {
    const active = getActiveCampaigns(spotlight.campaigns ?? []);
    const picked = pickCampaignForDisplay(active, spotlight.campaignRotation);
    if (picked) {
      return campaignToDisplayFields(picked);
    }
    return resolveDailyOrExercise(exercises, { ...spotlight, mode: 'daily' });
  }

  return resolveDailyOrExercise(exercises, spotlight);
}

export const DEFAULT_HERO_SPOTLIGHT: HeroSpotlightSettings = {
  mode: 'daily',
  campaigns: [],
  stats: {},
  campaignRotation: 'queue',
};
