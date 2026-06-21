import { useCallback, useState } from 'react';
import {
  MOBILE_CATALOG_VIEW_KEY,
  readMobileCatalogView,
  type MobileCatalogView,
} from '../lib/mobilePreferences';

export function useMobileCatalogView() {
  const [catalogView, setCatalogViewState] = useState<MobileCatalogView>(() => readMobileCatalogView());

  const setCatalogView = useCallback((view: MobileCatalogView) => {
    setCatalogViewState(view);
    localStorage.setItem(MOBILE_CATALOG_VIEW_KEY, view);
  }, []);

  return { catalogView, setCatalogView };
}
