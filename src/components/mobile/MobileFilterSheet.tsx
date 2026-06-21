import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { AdvancedFilterState } from '../../lib/exerciseFilters';
import {
  countActiveAdvancedFilterGroups,
  hasActiveAdvancedFilters,
} from '../../lib/exerciseFilters';
import { Icon } from '../Icon';
import { AdvancedFiltersContent } from './AdvancedFiltersContent';

interface MobileFilterSheetProps {
  open: boolean;
  onClose: () => void;
  filters: AdvancedFilterState;
  onChange: (next: AdvancedFilterState) => void;
  onReset: () => void;
  resultCount?: number;
  activeCategory?: string;
  favoriteCount?: number;
}

export function MobileFilterSheet({
  open,
  onClose,
  filters,
  onChange,
  onReset,
  resultCount,
  activeCategory,
  favoriteCount = 0,
}: MobileFilterSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const activeCount = countActiveAdvancedFilterGroups(filters);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="mobile-filter-sheet__overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="mobile-filter-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-filter-sheet__handle" aria-hidden="true" />
            <header className="mobile-filter-sheet__header">
              <div>
                <h2 id="mobile-filter-title" className="mobile-filter-sheet__title">
                  Filtros
                </h2>
                {typeof resultCount === 'number' && hasActiveAdvancedFilters(filters) && (
                  <p className="mobile-filter-sheet__meta">
                    {resultCount} {resultCount === 1 ? 'exercício' : 'exercícios'}
                  </p>
                )}
              </div>
              <div className="mobile-filter-sheet__header-actions">
                {hasActiveAdvancedFilters(filters) && (
                  <button type="button" className="mobile-filter-sheet__clear" onClick={onReset}>
                    Limpar
                  </button>
                )}
                <button
                  type="button"
                  className="mobile-filter-sheet__close"
                  onClick={onClose}
                  aria-label="Fechar filtros"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </div>
            </header>
            <div className="mobile-filter-sheet__body">
              <AdvancedFiltersContent
                filters={filters}
                onChange={onChange}
                activeCategory={activeCategory}
                favoriteCount={favoriteCount}
              />
            </div>
            <footer className="mobile-filter-sheet__footer">
              <button type="button" className="mobile-filter-sheet__apply" onClick={onClose}>
                {activeCount > 0 ? `Ver resultados` : 'Fechar'}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface MobileFilterTriggerProps {
  activeCount: number;
  onClick: () => void;
}

export function MobileFilterTrigger({ activeCount, onClick }: MobileFilterTriggerProps) {
  return (
    <div className="mobile-filter-trigger-row cinema-container mb-fluid-sm">
      <button type="button" className="mobile-filter-trigger" onClick={onClick}>
        <Icon name="filter" className="w-4 h-4 shrink-0" />
        <span>Filtros</span>
        {activeCount > 0 && <span className="mobile-filter-trigger__badge">{activeCount}</span>}
      </button>
    </div>
  );
}
