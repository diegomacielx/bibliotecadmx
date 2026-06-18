import { isMobileUi } from '../hooks/useMediaQuery';

/** Funcionalidades disponíveis no mobile — desktop mantém tudo */
export const MOBILE_FEATURES = {
  browse: true,
  search: true,
  categories: true,
  favorites: true,
  watchVideo: true,
  playlist: true,
  copyLink: true,
  download: true,
  /** Botão nos cards; modo lado a lado só no desktop */
  compare: true,
  compareBanner: false,
  adminStudio: true,
  heroFeatured: true,
} as const;

export type MobileFeature = keyof typeof MOBILE_FEATURES;

export function isFeatureEnabled(feature: MobileFeature): boolean {
  if (!isMobileUi()) return true;
  return MOBILE_FEATURES[feature];
}
