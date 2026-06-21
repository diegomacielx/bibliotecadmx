import type { Exercise, ExerciseForm, AdminTab } from '../../types';
import type { RecentExercise } from '../../hooks/useSearchHistory';
import type { MobileCatalogView } from '../../lib/mobilePreferences';
import { Icon } from '../Icon';
import { GridSkeleton } from '../Skeleton';
import { EmptyState } from '../EmptyState';
import { MobileCatalog } from './MobileCatalog';

interface MobileSearchScreenProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchCommit: (term: string) => void;
  searchHistory: string[];
  searchRecents: RecentExercise[];
  onSelectHistory: (term: string) => void;
  onSelectRecent: (firestoreId: string, name: string) => void;
  onRemoveHistoryItem: (term: string) => void;
  onClearHistory: () => void;
  searchSuggestions: Exercise[];
  onSelectSuggestion: (ex: Exercise) => void;
  onSearchAll: () => void;
  onSuggest: () => void;
  loading: boolean;
  slowConnection: boolean;
  filteredExercises: Exercise[];
  gridExercises: Exercise[];
  emptyStateVariant: 'search' | 'category' | 'filters' | 'favorites';
  activeCategory: string;
  onClearFilters: () => void;
  onSearchAllCategories?: () => void;
  onGoHome: () => void;
  filterTrigger: React.ReactNode;
  catalogView: MobileCatalogView;
  isAdmin: boolean;
  isExerciseIncomplete: (url: string) => boolean;
  handleDownloadCheck: (e: React.MouseEvent, ex: Exercise) => Promise<void>;
  setForm: (form: ExerciseForm) => void;
  setEditingId: (id: string | null) => void;
  setAdminTab: (tab: AdminTab) => void;
  setShowAdminPanel: (show: boolean) => void;
  copyLink: (url: string, firestoreId: string) => void;
  copiedId: string | null;
  onWatch: (ex: Exercise) => void;
  selectionMode: boolean;
  playlistOrder: string[];
  onTogglePlaylist: (ex: Exercise) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onCompare?: (ex: Exercise) => void;
  comparePickId?: string;
  cardHoverPreview: boolean;
  cardCoverParallax: boolean;
}

export function MobileSearchScreen({
  searchTerm,
  onSearchChange,
  onSearchCommit,
  searchHistory: _searchHistory,
  searchRecents: _searchRecents,
  onSelectHistory: _onSelectHistory,
  onSelectRecent: _onSelectRecent,
  onRemoveHistoryItem: _onRemoveHistoryItem,
  onClearHistory: _onClearHistory,
  searchSuggestions: _searchSuggestions,
  onSelectSuggestion: _onSelectSuggestion,
  onSearchAll: _onSearchAll,
  onSuggest,
  loading,
  slowConnection,
  filteredExercises,
  gridExercises,
  emptyStateVariant,
  activeCategory,
  onClearFilters,
  onSearchAllCategories,
  onGoHome,
  filterTrigger,
  catalogView,
  isAdmin,
  isExerciseIncomplete,
  handleDownloadCheck,
  setForm,
  setEditingId,
  setAdminTab,
  setShowAdminPanel,
  copyLink,
  copiedId,
  onWatch,
  selectionMode,
  playlistOrder,
  onTogglePlaylist,
  isFavorite,
  onToggleFavorite,
  onCompare,
  comparePickId,
  cardHoverPreview,
  cardCoverParallax,
}: MobileSearchScreenProps) {
  return (
    <div className="mobile-search-screen">
      <div className="mobile-search-screen__field-wrap">
        <div className="search-bar-wrap search-bar-wrap--focused w-full">
          <div className="search-bar-premium w-full">
            <span className="search-bar-icon-ring" aria-hidden="true">
              <Icon name="search" className="w-4 h-4" />
            </span>
            <input
              type="search"
              enterKeyHint="search"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="Buscar exercício, ID ou categoria…"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearchCommit(searchTerm.trim());
              }}
              className="search-bar-input flex-1 text-[var(--dmx-fg)]"
              aria-label="Buscar exercícios"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-bar-clear"
                onClick={() => onSearchChange('')}
                aria-label="Limpar busca"
              >
                <Icon name="x" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mobile-search-screen__results">
        {searchTerm.trim() && filterTrigger}

        {searchTerm.trim() && !loading && filteredExercises.length > 0 && (
          <p className="search-results-summary mb-fluid-md px-1">
            <span className="search-results-count">{filteredExercises.length}</span>
            {filteredExercises.length === 1 ? ' resultado' : ' resultados'}
          </p>
        )}

        {!searchTerm.trim() ? (
          <div className="mobile-search-screen__hint">
            <Icon name="search" className="w-8 h-8 opacity-30 mb-3" />
            <p className="text-sm text-[var(--dmx-fg-muted)]">
              Digite o nome, ID ou categoria do exercício
            </p>
          </div>
        ) : loading ? (
          <div className="py-fluid-xl">
            <GridSkeleton count={6} />
            {slowConnection && (
              <p className="text-2xs text-red-500 uppercase font-black mt-fluid-md text-center">
                A conexão parece lenta. Aguarde...
              </p>
            )}
          </div>
        ) : filteredExercises.length === 0 ? (
          <EmptyState
            variant={emptyStateVariant}
            searchTerm={searchTerm}
            category={activeCategory}
            onSuggest={onSuggest}
            onClearFilters={onClearFilters}
            onSearchAllCategories={onSearchAllCategories}
            onGoHome={onGoHome}
          />
        ) : (
          <MobileCatalog
            exercises={gridExercises}
            catalogView={catalogView}
            isAdmin={isAdmin}
            isExerciseIncomplete={isExerciseIncomplete}
            handleDownloadCheck={handleDownloadCheck}
            setForm={setForm}
            setEditingId={setEditingId}
            setAdminTab={setAdminTab}
            setShowAdminPanel={setShowAdminPanel}
            copyLink={copyLink}
            copiedId={copiedId}
            onWatch={onWatch}
            selectionMode={selectionMode}
            playlistOrder={playlistOrder}
            onTogglePlaylist={onTogglePlaylist}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            onCompare={onCompare}
            comparePickId={comparePickId}
            cardHoverPreview={cardHoverPreview}
            cardCoverParallax={cardCoverParallax}
          />
        )}
      </div>
    </div>
  );
}
