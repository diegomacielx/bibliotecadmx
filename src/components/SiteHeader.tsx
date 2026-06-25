import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User } from '../lib/firebase';
import type { Exercise, Notification } from '../types';
import type { UserProfile } from '../types';
import { BrandLogo } from './BrandLogo';
import { CUSTOM_LOGO_URL } from '../lib/constants';
import { Icon } from './Icon';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchChips } from './SearchChips';
import { UserAccountMenu } from './UserAccountMenu';
import { StudentSettingsPanel } from './StudentSettingsPanel';
import { UsageGuidePanel } from './UsageGuidePanel';
import { resolveDisplayNickname } from '../lib/nickname';
import type { RecentExercise } from '../hooks/useSearchHistory';
import type { ExerciseSortOrder } from '../lib/utils';
import { MobileSearchCategoryMenu } from './mobile/MobileSearchCategoryMenu';

interface SiteHeaderProps {
  user: User | null;
  userProfile: UserProfile | null;
  onUpdateNickname: (nickname: string) => Promise<void>;
  onResendVerification?: () => Promise<void>;
  videoLoop?: boolean;
  onToggleVideoLoop?: (enabled: boolean) => void;
  videoAutoplay?: boolean;
  onToggleVideoAutoplay?: (enabled: boolean) => void;
  compareLoopSync?: boolean;
  onToggleCompareLoopSync?: (enabled: boolean) => void;
  exerciseSortOrder?: ExerciseSortOrder;
  onExerciseSortOrderChange?: (order: ExerciseSortOrder) => void;
  saveRecentVideos?: boolean;
  onToggleSaveRecentVideos?: (enabled: boolean) => void;
  saveSearchHistory?: boolean;
  onToggleSaveSearchHistory?: (enabled: boolean) => void;
  liveSearchSuggestions?: boolean;
  onToggleLiveSearchSuggestions?: (enabled: boolean) => void;
  cardHoverPreview?: boolean;
  onToggleCardHoverPreview?: (enabled: boolean) => void;
  cardCoverParallax?: boolean;
  onToggleCardCoverParallax?: (enabled: boolean) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchCommit?: (term: string) => void;
  searchHistory?: string[];
  searchRecents?: RecentExercise[];
  onSelectHistory?: (term: string) => void;
  onSelectRecent?: (firestoreId: string, name: string) => void;
  onRemoveHistoryItem?: (term: string) => void;
  onClearHistory?: () => void;
  searchSuggestions?: Exercise[];
  onSelectSuggestion?: (ex: Exercise) => void;
  onSuggest: () => void;
  onLogout: () => void;
  unreadCount: number;
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  onClearNotifications: () => void;
  visibleNotifications: Notification[];
  lastReadAt: string | null;
  onNotificationClick: (exerciseId?: string) => void;
  onOpenShortcuts?: () => void;
  onGoHome?: () => void;
  /** Exibe «Guia de uso» no menu da conta (alunos) */
  enableStudentGuide?: boolean;
  /** Shell mobile: header compacto com busca centralizada */
  mobileShellMode?: boolean;
  /** Admin mobile: header compacto sem busca, mantém menu de conta */
  mobileCompactHeader?: boolean;
  /** Aba Conta ativa — exibe marca no lugar da busca */
  mobileAccountScreenActive?: boolean;
  /** Busca ativa — troca lâmpada por filtro de categorias */
  mobileSearchWithCategory?: boolean;
  mobileSearchCategories?: readonly string[];
  mobileSearchActiveCategory?: string;
  onMobileSearchCategoryChange?: (cat: string) => void;
}

function UserAvatar({ name }: { name: string }) {
  const initial = (name.trim()[0] || 'D').toUpperCase();
  return (
    <span
      className="flex items-center justify-center w-[1.875rem] h-[1.875rem] rounded-full text-white text-[11px] font-semibold shrink-0 select-none"
      style={{
        background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
        boxShadow: '0 0 0 1.5px rgba(244,63,94,0.25), 0 2px 6px rgba(0,0,0,0.4)',
        letterSpacing: '0.02em',
      }}
    >
      {initial}
    </span>
  );
}

export function SiteHeader({
  user,
  userProfile,
  onUpdateNickname,
  onResendVerification,
  videoLoop = false,
  onToggleVideoLoop,
  videoAutoplay = true,
  onToggleVideoAutoplay,
  compareLoopSync = false,
  onToggleCompareLoopSync,
  exerciseSortOrder,
  onExerciseSortOrderChange,
  saveRecentVideos,
  onToggleSaveRecentVideos,
  saveSearchHistory,
  onToggleSaveSearchHistory,
  liveSearchSuggestions = true,
  onToggleLiveSearchSuggestions,
  cardHoverPreview,
  onToggleCardHoverPreview,
  cardCoverParallax,
  onToggleCardCoverParallax,
  searchTerm,
  onSearchChange,
  onSearchCommit,
  searchHistory = [],
  searchRecents = [],
  onSelectHistory,
  onSelectRecent,
  onRemoveHistoryItem,
  onClearHistory,
  searchSuggestions = [],
  onSelectSuggestion,
  onSuggest,
  onLogout,
  unreadCount,
  showNotifications,
  onToggleNotifications,
  onCloseNotifications,
  onClearNotifications,
  visibleNotifications,
  lastReadAt,
  onNotificationClick,
  onOpenShortcuts,
  onGoHome,
  enableStudentGuide = false,
  mobileShellMode = false,
  mobileCompactHeader = false,
  mobileAccountScreenActive = false,
  mobileSearchWithCategory = false,
  mobileSearchCategories,
  mobileSearchActiveCategory = 'Todos',
  onMobileSearchCategoryChange,
}: SiteHeaderProps) {
  const hideMobileSearch = mobileShellMode || mobileCompactHeader;
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [usageGuideOpen, setUsageGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const showStudentSettings = onToggleLiveSearchSuggestions != null;
  const [searchFocused, setSearchFocused] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const input = isDesktop ? desktopSearchRef.current : mobileSearchRef.current;
    input?.focus();
    setSearchFocused(true);
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (userMenuRef.current?.contains(e.target as Node)) return;
      setShowUserMenu(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showUserMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowUserMenu(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showUserMenu]);

  useEffect(() => {
    if (!showNotifications) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseNotifications();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNotifications, onCloseNotifications]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        focusSearch();
      }
      if (e.key === 'Escape' && searchFocused) {
        setSearchFocused(false);
        (document.activeElement as HTMLElement)?.blur?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusSearch, searchFocused]);

  const displayNickname = resolveDisplayNickname({
    nickname: userProfile?.nickname,
    name: userProfile?.name,
    email: user?.email,
  });
  const showSuggestions =
    liveSearchSuggestions && searchFocused && searchTerm.trim().length >= 2;
  const showChips =
    searchFocused && !searchTerm.trim() && (searchHistory.length > 0 || searchRecents.length > 0);

  const handleBrandHomeClick = () => {
    setSettingsOpen(false);
    setUsageGuideOpen(false);
    setShowUserMenu(false);
    onGoHome?.();
  };

  const renderMobileShellSearch = () => (
    <div
      className={`mobile-shell-header__search search-bar-wrap w-full min-w-0 ${
        searchFocused ? 'search-bar-wrap--focused' : ''
      }`}
    >
      <div className="search-bar-premium search-bar-premium--header w-full">
        <span className="search-bar-icon-ring" aria-hidden="true">
          <Icon name="search" className="w-3.5 h-3.5" />
        </span>
        <input
          ref={mobileSearchRef}
          id="mobile-header-search"
          name="search"
          type="search"
          enterKeyHint="search"
          placeholder="Buscar exercícios…"
          className="search-bar-input search-bar-input--header flex-1 text-[var(--dmx-fg)]"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchTerm.trim()) {
              onSearchCommit?.(searchTerm.trim());
              setSearchFocused(false);
            }
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
          aria-expanded={showSuggestions || showChips}
          aria-autocomplete="list"
          aria-label="Buscar exercícios"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="search-bar-clear"
            aria-label="Limpar busca"
          >
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <SearchSuggestions
        query={searchTerm}
        suggestions={searchSuggestions}
        visible={showSuggestions}
        onSelect={(ex) => {
          onSelectSuggestion?.(ex);
          setSearchFocused(false);
        }}
        onSearchAll={() => {
          onSearchCommit?.(searchTerm.trim());
          setSearchFocused(false);
        }}
      />
      <SearchChips
        history={searchHistory}
        recents={searchRecents}
        visible={showChips}
        onSelectHistory={(term) => {
          onSelectHistory?.(term);
          setSearchFocused(false);
        }}
        onSelectRecent={(id, name) => {
          onSelectRecent?.(id, name);
          setSearchFocused(false);
        }}
        onRemoveHistory={(term) => onRemoveHistoryItem?.(term)}
        onClearHistory={() => onClearHistory?.()}
      />
    </div>
  );

  const renderSearchField = (inputRef: React.RefObject<HTMLInputElement | null>, showKbd: boolean) => (
    <div className={`search-bar-wrap relative w-full ${searchFocused ? 'search-bar-wrap--focused' : ''}`}>
      <div className="search-bar-premium w-full">
        <span className="search-bar-icon-ring" aria-hidden="true">
          <Icon name="search" className="w-4 h-4" />
        </span>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          placeholder={showKbd ? 'Buscar exercício, músculo ou ID…' : 'Buscar exercícios…'}
          className="search-bar-input flex-1 text-[var(--dmx-fg)]"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchTerm.trim()) {
              onSearchCommit?.(searchTerm.trim());
              setSearchFocused(false);
            }
          }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
          aria-expanded={showSuggestions || showChips}
          aria-autocomplete="list"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="search-bar-clear"
            aria-label="Limpar busca"
          >
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        ) : showKbd ? (
          <span className="search-bar-kbd hidden xl:flex" aria-hidden="true">
            <kbd>Ctrl</kbd>
            <span>K</span>
          </span>
        ) : null}
      </div>
      <SearchSuggestions
        query={searchTerm}
        suggestions={searchSuggestions}
        visible={showSuggestions}
        onSelect={(ex) => {
          onSelectSuggestion?.(ex);
          setSearchFocused(false);
        }}
        onSearchAll={() => {
          onSearchCommit?.(searchTerm.trim());
          setSearchFocused(false);
        }}
      />
      <SearchChips
        history={searchHistory}
        recents={searchRecents}
        visible={showChips}
        onSelectHistory={(term) => {
          onSelectHistory?.(term);
          setSearchFocused(false);
        }}
        onSelectRecent={(id, name) => {
          onSelectRecent?.(id, name);
          setSearchFocused(false);
        }}
        onRemoveHistory={(term) => onRemoveHistoryItem?.(term)}
        onClearHistory={() => onClearHistory?.()}
      />
    </div>
  );

  const renderNotifications = () => (
    <div className="relative flex items-center" ref={notificationsRef}>
      <button
        type="button"
        onClick={onToggleNotifications}
        className="header-action header-action--icon relative"
        title="Notificações"
        aria-label="Notificações"
        aria-expanded={showNotifications}
      >
        <span className="header-action-icon-slot">
          <Icon name="bell" className="shrink-0" strokeWidth={1.35} />
        </span>
        {unreadCount > 0 && (
          <span className="header-notif-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={onCloseNotifications}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="fixed sm:absolute top-[60px] sm:top-[calc(100%+0.5rem)] right-4 sm:right-0 w-[min(calc(100vw-2rem),380px)] dropdown-panel z-[9999] overflow-hidden flex flex-col"
            >
              <div className="px-4 py-3.5 flex justify-between items-center border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-white">Notificações</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] text-red-400 font-medium">{unreadCount} novas</span>
                  )}
                </div>
                {visibleNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearNotifications}
                    className="text-[10px] text-zinc-500 hover:text-white font-medium ease-cinematic duration-cinematic"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="p-2 max-h-[360px] overflow-y-auto no-scrollbar flex flex-col gap-1.5">
                {visibleNotifications.length === 0 ? (
                  <div className="py-10 text-center text-zinc-500 text-xs">
                    Nenhuma notificação recente
                  </div>
                ) : (
                  visibleNotifications.map((n) => {
                    const isUnread = !lastReadAt || n.createdAt > lastReadAt;
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onNotificationClick(n.exerciseId)}
                        className={`w-full text-left p-3 rounded-xl flex gap-3 ease-cinematic duration-cinematic ${
                          isUnread
                            ? 'bg-surface-raised/60 border border-red-500/20'
                            : 'hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                          <img
                            src={n.thumbnail || CUSTOM_LOGO_URL}
                            className="w-full h-full object-cover"
                            alt=""
                            loading="lazy"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide truncate">
                            {n.title}
                          </p>
                          <p className="text-xs text-zinc-300 line-clamp-2 mt-0.5">{n.message}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
    <header className={`site-header sticky top-0 z-[100] ${mobileShellMode ? 'site-header--shell-compact' : ''} ${mobileCompactHeader ? 'site-header--compact-admin' : ''}`}>
      <div className="site-header-inner cinema-container">
        {mobileShellMode ? (
          <div className="mobile-shell-header-row">
            {mobileAccountScreenActive ? (
              <div className="mobile-shell-header__brand-only" aria-hidden="true" />
            ) : mobileSearchWithCategory && mobileSearchCategories && onMobileSearchCategoryChange ? (
              <MobileSearchCategoryMenu
                categories={mobileSearchCategories}
                activeCategory={mobileSearchActiveCategory}
                onCategoryChange={onMobileSearchCategoryChange}
              />
            ) : (
              <button
                type="button"
                onClick={onSuggest}
                className="mobile-shell-header__lead-btn header-action header-action--icon"
                aria-label="Sugerir exercício"
                title="Sugerir exercício"
              >
                <span className="header-action-icon-slot">
                  <Icon name="lightbulb" className="shrink-0" strokeWidth={1.35} />
                </span>
              </button>
            )}

            {mobileAccountScreenActive ? (
              <h1 className="header-brand-title mobile-shell-header__title">
                Biblioteca <span className="text-red-500">DMX</span>
              </h1>
            ) : (
              renderMobileShellSearch()
            )}

            <div className="mobile-shell-header__actions header-actions">
              {renderNotifications()}
            </div>
          </div>
        ) : (
        <>
        <div className={`flex items-center gap-4 lg:gap-8 ${mobileCompactHeader ? 'py-2' : 'py-3 lg:py-4'}`}>
          <button
            type="button"
            onClick={handleBrandHomeClick}
            className="header-brand shrink-0 text-left"
            aria-label="Voltar ao início — categoria Todos"
            title="Início"
          >
            <div className="header-brand-logo-wrap">
              <BrandLogo variant="header" />
            </div>
            <div className="header-brand-text hidden sm:flex">
              <h1 className="header-brand-title">
                Biblioteca <span className="text-red-500">DMX</span>
              </h1>
              <p className="header-brand-tagline">Execuções em alta definição</p>
            </div>
          </button>

          <div className="hidden lg:flex flex-1 max-w-3xl xl:max-w-4xl mx-auto min-w-0 items-center">
            {renderSearchField(desktopSearchRef, true)}
          </div>

          <div className="header-actions flex items-center ml-auto shrink-0">
            {onOpenShortcuts && (
              <button
                type="button"
                onClick={onOpenShortcuts}
                className="header-action header-action--icon hidden md:inline-flex"
                title="Atalhos de teclado (?)"
                aria-label="Atalhos de teclado"
              >
                <span className="header-action-icon-slot">
                  <Icon name="help" className="shrink-0" strokeWidth={1.35} />
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onSuggest}
              className="header-action header-action--icon hidden sm:inline-flex"
              aria-label="Sugerir exercício"
              title="Sugerir exercício"
            >
              <span className="header-action-icon-slot">
                <Icon name="lightbulb" className="shrink-0" strokeWidth={1.35} />
              </span>
            </button>

            {renderNotifications()}

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((v) => !v)}
                className="header-action header-action--user"
                aria-expanded={showUserMenu}
              >
                <UserAvatar name={displayNickname} />
                <span className="hidden md:inline text-[11px] font-medium text-zinc-300 max-w-[120px] truncate">
                  {displayNickname}
                </span>
                <Icon name="chevrondown" className="w-3 h-3 text-zinc-500 hidden md:block" />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-[9999]"
                  >
                    <UserAccountMenu
                      user={user}
                      userProfile={userProfile}
                      onUpdateNickname={onUpdateNickname}
                      onResendVerification={onResendVerification}
                      onOpenSettings={
                        showStudentSettings
                          ? () => {
                              setShowUserMenu(false);
                              setSettingsOpen(true);
                            }
                          : undefined
                      }
                      onOpenUsageGuide={
                        enableStudentGuide
                          ? () => {
                              setShowUserMenu(false);
                              setUsageGuideOpen(true);
                            }
                          : undefined
                      }
                      onLogout={() => {
                        setShowUserMenu(false);
                        void onLogout();
                      }}
                      onClose={() => setShowUserMenu(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {!hideMobileSearch && (
        <div className="lg:hidden pb-3">
          {renderSearchField(mobileSearchRef, false)}
        </div>
        )}
        </>
        )}
      </div>
    </header>
      {showStudentSettings && (
        <StudentSettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          exerciseSortOrder={exerciseSortOrder ?? 'alpha'}
          onExerciseSortOrderChange={onExerciseSortOrderChange!}
          saveRecentVideos={saveRecentVideos ?? false}
          onToggleSaveRecentVideos={onToggleSaveRecentVideos!}
          saveSearchHistory={saveSearchHistory ?? true}
          onToggleSaveSearchHistory={onToggleSaveSearchHistory!}
          liveSearchSuggestions={liveSearchSuggestions ?? true}
          onToggleLiveSearchSuggestions={onToggleLiveSearchSuggestions!}
          cardHoverPreview={cardHoverPreview ?? true}
          onToggleCardHoverPreview={onToggleCardHoverPreview!}
          cardCoverParallax={cardCoverParallax ?? true}
          onToggleCardCoverParallax={onToggleCardCoverParallax!}
          videoLoop={videoLoop ?? false}
          onToggleVideoLoop={onToggleVideoLoop!}
          videoAutoplay={videoAutoplay ?? true}
          onToggleVideoAutoplay={onToggleVideoAutoplay!}
          compareLoopSync={compareLoopSync ?? false}
          onToggleCompareLoopSync={onToggleCompareLoopSync!}
        />
      )}
      {enableStudentGuide && (
        <UsageGuidePanel
          open={usageGuideOpen}
          onClose={() => setUsageGuideOpen(false)}
          onOpenShortcuts={onOpenShortcuts}
        />
      )}
    </>
  );
}
