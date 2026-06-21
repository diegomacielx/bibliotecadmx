export type MobileCatalogView = 'grid' | 'list';

export const MOBILE_CATALOG_VIEW_KEY = 'dmx_mobile_catalog_view';
export const MOBILE_HERO_COLLAPSED_KEY = 'dmx_mobile_hero_collapsed';

export function readMobileCatalogView(): MobileCatalogView {
  if (typeof window === 'undefined') return 'grid';
  const raw = localStorage.getItem(MOBILE_CATALOG_VIEW_KEY);
  return raw === 'list' ? 'list' : 'grid';
}

export function readMobileHeroCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MOBILE_HERO_COLLAPSED_KEY) === 'true';
}
