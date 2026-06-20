import { useCallback, useState } from 'react';
import {
  readSaveRecentVideos,
  readSaveSearchHistory,
  readCardHoverPreview,
  readCardCoverParallax,
  SAVE_RECENT_VIDEOS_KEY,
  SAVE_SEARCH_HISTORY_KEY,
  CARD_HOVER_PREVIEW_KEY,
  CARD_COVER_PARALLAX_KEY,
} from '../lib/searchPreferences';

export function useSearchPreferences() {
  const [saveRecentVideos, setSaveRecentVideosState] = useState(readSaveRecentVideos);
  const [saveSearchHistory, setSaveSearchHistoryState] = useState(readSaveSearchHistory);
  const [cardHoverPreview, setCardHoverPreviewState] = useState(readCardHoverPreview);
  const [cardCoverParallax, setCardCoverParallaxState] = useState(readCardCoverParallax);

  const setSaveRecentVideos = useCallback((enabled: boolean) => {
    setSaveRecentVideosState(enabled);
    localStorage.setItem(SAVE_RECENT_VIDEOS_KEY, String(enabled));
  }, []);

  const setSaveSearchHistory = useCallback((enabled: boolean) => {
    setSaveSearchHistoryState(enabled);
    localStorage.setItem(SAVE_SEARCH_HISTORY_KEY, String(enabled));
  }, []);

  const setCardHoverPreview = useCallback((enabled: boolean) => {
    setCardHoverPreviewState(enabled);
    localStorage.setItem(CARD_HOVER_PREVIEW_KEY, String(enabled));
  }, []);

  const setCardCoverParallax = useCallback((enabled: boolean) => {
    setCardCoverParallaxState(enabled);
    localStorage.setItem(CARD_COVER_PARALLAX_KEY, String(enabled));
  }, []);

  return {
    saveRecentVideos,
    saveSearchHistory,
    cardHoverPreview,
    cardCoverParallax,
    setSaveRecentVideos,
    setSaveSearchHistory,
    setCardHoverPreview,
    setCardCoverParallax,
  };
}
