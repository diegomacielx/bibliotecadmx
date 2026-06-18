import { useCallback, useEffect, useState } from 'react';
import type { Exercise } from '../types';
import { CUSTOM_LOGO_URL } from '../lib/constants';
import { getStoredTheme, setTheme } from '../lib/theme';
import { MobileCard } from './MobileCard';
import { MobileHero } from './MobileHero';
import { MobileExerciseDetail } from './MobileExerciseDetail';
import './mobile.css';

export interface MobileShellProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  onSearchCommit: () => void;
  categories: readonly string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  favoritesCount: number;
  exercises: Exercise[];
  featuredExercise: Exercise | null;
  featuredFromFavorites: boolean;
  loading: boolean;
  copiedId: string | null;
  onCopy: (url: string, firestoreId: string) => void;
  onDownload: (ex: Exercise, quality: string) => void;
  onLogout: () => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  playlist: Exercise[];
  playlistOrder: string[];
  onTogglePlaylist: (ex: Exercise) => void;
  onEndSelectionMode: () => void;
  onClearPlaylist: () => void;
  showAdminUI: boolean;
  adminUserPreview: boolean;
  onExitAdminPreview: () => void;
  onOpenAdmin: () => void;
  navList: Exercise[];
}

export function MobileShell({
  searchTerm,
  onSearchChange,
  onSearchCommit,
  categories,
  activeCategory,
  onCategoryChange,
  favoritesCount,
  exercises,
  featuredExercise,
  featuredFromFavorites,
  loading,
  copiedId,
  onCopy,
  onDownload,
  onLogout,
  isFavorite,
  onToggleFavorite,
  selectionMode,
  onToggleSelectionMode,
  playlist,
  playlistOrder,
  onTogglePlaylist,
  onEndSelectionMode,
  onClearPlaylist,
  showAdminUI,
  adminUserPreview,
  onExitAdminPreview,
  onOpenAdmin,
  navList,
}: MobileShellProps) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);

  useEffect(() => {
    if (selectionMode) setOpenCardId(null);
  }, [selectionMode]);

  useEffect(() => {
    if (!openCardId) return;
    const close = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('.m-card')) return;
      setOpenCardId(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [openCardId]);

  const openDetail = useCallback((ex: Exercise) => {
    setOpenCardId(null);
    setDetailEx(ex);
  }, []);

  const detailIndex = detailEx ? navList.findIndex((e) => e.firestoreId === detailEx.firestoreId) : -1;

  const goDetailNav = (delta: number) => {
    if (detailIndex < 0 || navList.length === 0) return;
    const next = navList[detailIndex + delta];
    if (next) setDetailEx(next);
  };

  const showHero =
    !searchTerm.trim() && activeCategory === 'Todos' && featuredExercise && !loading;

  return (
    <div className="m-shell">
      <header className="m-header">
        <img src={CUSTOM_LOGO_URL} alt="Biblioteca DMX" className="m-header-logo" />
        <span className="m-header-mode">MOBILE SHELL</span>
        <input
          type="search"
          className="m-header-search"
          placeholder="Buscar exercício…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSearchCommit();
          }}
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
        />
        <button
          type="button"
          className="m-header-btn"
          onClick={() => setTheme(getStoredTheme() === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
        >
          ◐
        </button>
        {showAdminUI && (
          <button type="button" className="m-header-btn" onClick={onOpenAdmin}>
            Admin
          </button>
        )}
        <button type="button" className="m-header-btn m-header-btn--danger" onClick={onLogout}>
          Sair
        </button>
      </header>

      {adminUserPreview && (
        <div className="m-admin-bar">
          Visão de aluno
          <button type="button" onClick={onExitAdminPreview}>
            Voltar
          </button>
        </div>
      )}

      <nav className="m-cats" aria-label="Categorias">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`m-cat ${activeCategory === cat ? 'm-cat--active' : ''}`}
            onClick={() => onCategoryChange(cat)}
          >
            {cat}
            {cat === 'Favoritos' && favoritesCount > 0 ? ` (${favoritesCount})` : ''}
          </button>
        ))}
      </nav>

      <main className="m-main">
        {loading ? (
          <p className="m-empty">Carregando exercícios…</p>
        ) : exercises.length === 0 ? (
          <p className="m-empty">Nenhum exercício encontrado.</p>
        ) : (
          <>
            {showHero && (
              <MobileHero
                ex={featuredExercise}
                fromFavorites={featuredFromFavorites}
                onOpenDetail={() => openDetail(featuredExercise)}
              />
            )}

            {!showHero && searchTerm.trim() && (
              <p className="m-grid-status">
                {exercises.length} resultado{exercises.length !== 1 ? 's' : ''}
              </p>
            )}

            <div className="m-grid">
              {exercises.map((ex) => {
                const seq = selectionMode ? playlistOrder.indexOf(ex.firestoreId) : -1;
                return (
                  <MobileCard
                    key={ex.firestoreId}
                    ex={ex}
                    open={openCardId === ex.firestoreId}
                    onToggle={() =>
                      setOpenCardId((prev) => (prev === ex.firestoreId ? null : ex.firestoreId))
                    }
                    isFavorite={isFavorite(ex.firestoreId)}
                    onToggleFavorite={() => onToggleFavorite(ex.firestoreId)}
                    onCopy={() => onCopy(ex.youtubeUrl, ex.firestoreId)}
                    copied={copiedId === ex.firestoreId}
                    onDownload4K={() => void onDownload(ex, '4K')}
                    selectionMode={selectionMode}
                    playlistSequence={seq >= 0 ? seq + 1 : undefined}
                    onTogglePlaylist={() => onTogglePlaylist(ex)}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      <div className="m-playlist">
        <button type="button" className="m-playlist-btn m-playlist-btn--ghost" onClick={onToggleSelectionMode}>
          {selectionMode ? 'Concluir treino' : 'Montar treino'}
        </button>
        {playlist.length > 0 && (
          <>
            <button
              type="button"
              className="m-playlist-btn m-playlist-btn--primary"
              onClick={() => {
                if (playlist.length === 0) return;
                onEndSelectionMode();
                openDetail(playlist[0]);
              }}
            >
              Reproduzir ({playlist.length})
            </button>
            <button type="button" className="m-playlist-btn m-playlist-btn--ghost" onClick={onClearPlaylist}>
              Limpar
            </button>
          </>
        )}
      </div>

      {detailEx && (
        <MobileExerciseDetail
          ex={detailEx}
          onClose={() => setDetailEx(null)}
          onCopy={() => onCopy(detailEx.youtubeUrl, detailEx.firestoreId)}
          copied={copiedId === detailEx.firestoreId}
          onDownload4K={() => void onDownload(detailEx, '4K')}
          isFavorite={isFavorite(detailEx.firestoreId)}
          onToggleFavorite={() => onToggleFavorite(detailEx.firestoreId)}
          navIndex={detailIndex >= 0 ? detailIndex : 0}
          navTotal={navList.length}
          onPrev={() => goDetailNav(-1)}
          onNext={() => goDetailNav(1)}
          canPrev={detailIndex > 0}
          canNext={detailIndex >= 0 && detailIndex < navList.length - 1}
        />
      )}
    </div>
  );
}
