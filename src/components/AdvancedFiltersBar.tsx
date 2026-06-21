import { useEffect, useRef, useState } from 'react';
import type { AdvancedFilterState } from '../lib/exerciseFilters';
import {
  countActiveAdvancedFilterGroups,
  hasActiveAdvancedFilters,
} from '../lib/exerciseFilters';
import { Icon } from './Icon';
import { AdvancedFiltersContent } from './mobile/AdvancedFiltersContent';

interface AdvancedFiltersBarProps {
  filters: AdvancedFilterState;
  onChange: (next: AdvancedFilterState) => void;
  onReset: () => void;
  resultCount?: number;
  activeCategory?: string;
  favoriteCount?: number;
}

export function AdvancedFiltersBar({
  filters,
  onChange,
  onReset,
  resultCount,
  activeCategory,
  favoriteCount = 0,
}: AdvancedFiltersBarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount = countActiveAdvancedFilterGroups(filters);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  return (
    <div className="advanced-filters cinema-container mb-fluid-md">
      <div
        ref={rootRef}
        className={`advanced-filters-shell ${open ? 'advanced-filters-shell--open' : ''}`}
      >
        <div className="advanced-filters-bar">
          <button
            type="button"
            className={`advanced-filters-toggle ${open ? 'advanced-filters-toggle--open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <Icon name="filter" className="w-4 h-4 shrink-0" />
            <span>Filtros avançados</span>
            {activeCount > 0 && <span className="advanced-filters-badge">{activeCount}</span>}
            <Icon name="chevrondown" className="w-3.5 h-3.5 advanced-filters-chevron" />
          </button>

          {hasActiveAdvancedFilters(filters) && (
            <button type="button" className="advanced-filters-clear" onClick={onReset}>
              Limpar
            </button>
          )}

          {typeof resultCount === 'number' && hasActiveAdvancedFilters(filters) && (
            <span className="advanced-filters-count">
              {resultCount} {resultCount === 1 ? 'exercício' : 'exercícios'}
            </span>
          )}
        </div>

        {open && (
          <div className="advanced-filters-panel-wrap">
            <AdvancedFiltersContent
              filters={filters}
              onChange={onChange}
              activeCategory={activeCategory}
              favoriteCount={favoriteCount}
            />
          </div>
        )}
      </div>
    </div>
  );
}
