import { Icon } from '../Icon';
import type { MobileCatalogView } from '../../lib/mobilePreferences';

interface MobileCatalogToolbarProps {
  filterActiveCount: number;
  onOpenFilters: () => void;
  catalogView: MobileCatalogView;
  onCatalogViewChange: (view: MobileCatalogView) => void;
}

export function MobileCatalogToolbar({
  filterActiveCount,
  onOpenFilters,
  catalogView,
  onCatalogViewChange,
}: MobileCatalogToolbarProps) {
  return (
    <div className="mobile-catalog-toolbar cinema-container mb-fluid-sm">
      <button type="button" className="mobile-filter-trigger" onClick={onOpenFilters}>
        <Icon name="filter" className="w-4 h-4 shrink-0" />
        <span>Filtros</span>
        {filterActiveCount > 0 && (
          <span className="mobile-filter-trigger__badge">{filterActiveCount}</span>
        )}
      </button>

      <div className="mobile-catalog-view-toggle" role="group" aria-label="Visualização do catálogo">
        <button
          type="button"
          className={`mobile-catalog-view-toggle__btn ${
            catalogView === 'grid' ? 'mobile-catalog-view-toggle__btn--active' : ''
          }`}
          onClick={() => onCatalogViewChange('grid')}
          aria-pressed={catalogView === 'grid'}
          aria-label="Grade"
        >
          <Icon name="columns" className="w-4 h-4" />
        </button>
        <button
          type="button"
          className={`mobile-catalog-view-toggle__btn ${
            catalogView === 'list' ? 'mobile-catalog-view-toggle__btn--active' : ''
          }`}
          onClick={() => onCatalogViewChange('list')}
          aria-pressed={catalogView === 'list'}
          aria-label="Lista"
        >
          <Icon name="listtodo" className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
