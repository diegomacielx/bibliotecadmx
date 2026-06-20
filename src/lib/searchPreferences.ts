export const SAVE_RECENT_VIDEOS_KEY = 'dmx_save_recent_videos';
export const SAVE_SEARCH_HISTORY_KEY = 'dmx_save_search_history';
export const CARD_HOVER_PREVIEW_KEY = 'dmx_card_hover_preview';
export const CARD_COVER_PARALLAX_KEY = 'dmx_card_cover_parallax';

export function readSaveRecentVideos(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SAVE_RECENT_VIDEOS_KEY) === 'true';
}

export function readSaveSearchHistory(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(SAVE_SEARCH_HISTORY_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function readCardHoverPreview(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(CARD_HOVER_PREVIEW_KEY);
  if (raw === null) return true;
  return raw === 'true';
}

export function readCardCoverParallax(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = localStorage.getItem(CARD_COVER_PARALLAX_KEY);
  if (raw === null) return true;
  return raw === 'true';
}
