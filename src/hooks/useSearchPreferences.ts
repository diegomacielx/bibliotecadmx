import { useCallback, useState } from 'react';
import {
  readSaveRecentVideos,
  readSaveSearchHistory,
  readLiveSearchSuggestions,
  readCardHoverPreview,
  readCardCoverParallax,
  SAVE_RECENT_VIDEOS_KEY,
  SAVE_SEARCH_HISTORY_KEY,
  LIVE_SEARCH_SUGGESTIONS_KEY,
  CARD_HOVER_PREVIEW_KEY,
  CARD_COVER_PARALLAX_KEY,
} from '../lib/searchPreferences';

export function useSearchPreferences() {
  const [saveRecentVideos, setSaveRecentVideosState] = useState(readSaveRecentVideos);
  const [saveSearchHistory, setSaveSearchHistoryState] = useState(readSaveSearchHistory);
  const [liveSearchSuggestions, setLiveSearchSuggestionsState] = useState(readLiveSearchSuggestions);
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

  const setLiveSearchSuggestions = useCallback((enabled: boolean) => {
    setLiveSearchSuggestionsState(enabled);
    localStorage.setItem(LIVE_SEARCH_SUGGESTIONS_KEY, String(enabled));
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
    liveSearchSuggestions,
    cardHoverPreview,
    cardCoverParallax,
    setSaveRecentVideos,
    setSaveSearchHistory,
    setLiveSearchSuggestions,
    setCardHoverPreview,
    setCardCoverParallax,
  };
}
