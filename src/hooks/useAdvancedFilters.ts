import { useCallback, useEffect, useState } from 'react';
import { readJSON, writeJSON } from '../lib/storage';
import {
  DEFAULT_ADVANCED_FILTERS,
  parseAdvancedFilters,
  type AdvancedFilterState,
} from '../lib/exerciseFilters';

const STORAGE_KEY = 'dmx_advanced_filters';

export function useAdvancedFilters() {
  const [filters, setFiltersState] = useState<AdvancedFilterState>(() =>
    parseAdvancedFilters(readJSON(STORAGE_KEY, DEFAULT_ADVANCED_FILTERS))
  );

  useEffect(() => {
    writeJSON(STORAGE_KEY, filters);
  }, [filters]);

  const setFilters = useCallback((next: AdvancedFilterState) => {
    setFiltersState(next);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({ ...DEFAULT_ADVANCED_FILTERS });
  }, []);

  const patchFilters = useCallback((patch: Partial<AdvancedFilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  return { filters, setFilters, resetFilters, patchFilters };
}
