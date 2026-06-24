import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Exercise,
  ExerciseForm,
  UserProfile,
  Notification,
  ExerciseRequest,
  AuthorizedEmail,
  AppSettings,
  HeroSpotlightSettings,
  ToastState,
  AuthMode,
  AdminTab,
  AdminFilter,
} from './types';
import type { ExerciseSortOrder } from './lib/utils';
import { ADMIN_EMAILS, CUSTOM_LOGO_URL, DEFAULT_FORM, MOBILE_CATEGORY_NAV, NAV_CATEGORIES } from './lib/constants';
import {
  getDbPath,
  getAlternateExercisesPath,
  getYouTubeId,
  parseCommaList,
  isExerciseIncomplete,
  hasValidYouTubeUrl,
  compareExercisesBySortOrder,
  readExerciseSortOrder,
  EXERCISE_SORT_STORAGE_KEY,
  getNotifPath,
  getRequestsPath,
  getUsersPath,
  getAuthorizedPath,
  getSettingsPath,
  getUserProfilePath,
  getUserNotifSettingsPath,
  getUserPlaybackSettingsPath,
  logDebug,
  logError,
  logWarn,
  buildGcsVideoMetadataUrl,
  buildGcsVideoDownloadUrl,
  sanitizeDownloadFilename,
  triggerBrowserDownload,
} from './lib/utils';
import { normalizeMuscleGroups } from './lib/muscleGroups';
import { normalizeEquipment } from './lib/equipment';
import { getAuthErrorCode, getAuthErrorMessage } from './lib/authErrors';
import {
  buildExerciseSearchIndex,
  rankExercises,
  filterExercisesByCategory,
  getSearchPool,
} from './lib/search';
import { DEFAULT_HERO_SPOTLIGHT, resolveHeroDisplay } from './lib/heroSpotlight';
import { buildPlaylistSelectionLookup, getPlaylistSequence, playlistSelectionEmpty } from './lib/playlistSelection';
import { normalizeHeroSpotlight } from './lib/heroCampaign';
import { trackHeroCampaignClick, trackHeroCampaignImpression } from './lib/heroCampaignMetrics';
import {
  fb,
  db,
  auth,
  fbCollection,
  fbDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocFromServer,
  writeBatch,
  onSnapshot,
} from './lib/firebase';
import type { User } from './lib/firebase';
import { Icon } from './components/Icon';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginScreen } from './components/LoginScreen';
import { PendingAccessScreen } from './components/PendingAccessScreen';
import { BlockedAccessScreen } from './components/BlockedAccessScreen';
import { disposeYouTubeWarmup, primeVideoPlaybackIntent, primeYouTubePlayerApi } from './lib/videoPlaybackPrime';
import { reelsResetPlaybackMemory } from './lib/reelsPlaybackMemory';
import { signalMobilePlaybackGesture } from './lib/mobilePlaybackSession';
import { HeroBanner } from './components/HeroBanner';
import { ExerciseCard } from './components/ExerciseCard';
import { GridSkeleton } from './components/Skeleton';
import { EmptyState } from './components/EmptyState';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { isTypingTarget, isBackquoteKey, isCatalogShortcutMod } from './lib/keyboard';
import { staggerContainer, pageTransition } from './lib/motion';
import { SiteHeader } from './components/SiteHeader';
import { AdminStudioBar } from './components/AdminStudioBar';
import { CategoryNav } from './components/CategoryNav';
import { PlaylistBar } from './components/PlaylistBar';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useSearchPreferences } from './hooks/useSearchPreferences';
import { useFavorites } from './hooks/useFavorites';
import { isCoarsePointer, isMobileUi, useTouchLayoutClass } from './hooks/useMediaQuery';
import { isFeatureEnabled } from './lib/mobileCapabilities';
import { primeCoversFromExerciseList, prefetchExerciseCovers, resolveExerciseCoverUrl } from './lib/coverResolver';
import { scheduleKnownCoversWarmup } from './lib/coverImageCache';
import { getGridPrefetchPeers } from './lib/exercisePrefetch';
import { normalizeNickname, validateNickname, resolveDisplayNickname } from './lib/nickname';
import { sendTransactionalEmail } from './lib/email';
import { requestPasswordReset, requestEmailVerification, type AuthEmailResult } from './lib/authEmail';
import {
  getEmailPasswordLoginMessage,
  getNotRegisteredMessage,
  getRegisterBlockedMessage,
  isLoginCredentialError,
  lookupAuthEmail,
} from './lib/authLogin';
import { parseAuthActionParams, clearAuthActionParams } from './lib/authActionParams';
import {
  clearPendingGoogleLink,
  linkGoogleCredentialToUser,
  loadPendingGoogleLink,
  parseGoogleLinkError,
  persistCredentialPending,
  savePendingGoogleLink,
  type GoogleLinkPending,
} from './lib/googleAccountLink';
import { ensureUserProfile, getUserProfileIfExists } from './lib/authProfile';
import { adminRemoveUserProfile, adminSetUserStatus } from './lib/adminUserAccess';
import { AdvancedFiltersBar } from './components/AdvancedFiltersBar';
import { useAdvancedFilters } from './hooks/useAdvancedFilters';
import { applyAdvancedFilters, countActiveAdvancedFilterGroups, hasActiveAdvancedFilters } from './lib/exerciseFilters';
import { MobileShell, type MobileTab } from './components/mobile/MobileShell';
import { MobileWorkoutScreen } from './components/mobile/MobileWorkoutScreen';
import { MobileAccountScreen } from './components/mobile/MobileAccountScreen';
import { MobileFilterSheet } from './components/mobile/MobileFilterSheet';
import { MobileCatalog } from './components/mobile/MobileCatalog';
import { MobileCatalogToolbar } from './components/mobile/MobileCatalogToolbar';
import { StudentSettingsPanel } from './components/StudentSettingsPanel';
import { UsageGuidePanel } from './components/UsageGuidePanel';
import { useMobileCatalogView } from './hooks/useMobileCatalogView';
import { useMobileHeaderCollapse } from './hooks/useMobileHeaderCollapse';
import { MobileAdminShell } from './components/mobile/admin/MobileAdminShell';
import { MobileAdminHub } from './components/mobile/admin/MobileAdminHub';
import { MobileAdminMoreSheet } from './components/mobile/admin/MobileAdminMoreSheet';
import { MobileAdminDisabledNotice } from './components/mobile/admin/MobileAdminDisabledNotice';
import {
  readMobileAdminBannerDismissed,
  MOBILE_ADMIN_BANNER_DISMISSED_KEY,
  type MobileAdminTab,
} from './lib/adminMobile';
import { useGitHubCoverProbe, resolveNeedsGitHubCover } from './hooks/useGitHubCoverProbe';
import { buildExerciseWritePayload, applyExerciseSaveToList } from './lib/exercisePayload';
import { parseCoverFocusYInput } from './lib/coverFocus';
import {
  isAuthorizedEmailActive,
  syncUserAccess,
} from './lib/accessControl';
import { lockAppUrl } from './lib/mobileSessionGuard';

const GOOGLE_REDIRECT_PENDING_KEY = 'dmx-google-redirect-pending';

const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

const CinemaLightbox = lazy(() =>
  import('./components/CinemaLightbox').then((m) => ({ default: m.CinemaLightbox }))
);

const AuthActionScreen = lazy(() =>
  import('./components/AuthActionScreen').then((m) => ({ default: m.AuthActionScreen }))
);

const RequestModal = lazy(() =>
  import('./components/RequestModal').then((m) => ({ default: m.RequestModal }))
);

function resolveExerciseNavCategory(category: string | undefined | null): string {
  if (!category || category === 'Todos' || category === 'Favoritos') return 'Todos';
  if ((NAV_CATEGORIES as readonly string[]).includes(category)) return category;
  return 'Todos';
}

export default function App() {
  const isMobileLayout = useTouchLayoutClass();
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false);
  const [adminMobileTab, setAdminMobileTab] = useState<MobileAdminTab>('catalog');
  const [adminMoreOpen, setAdminMoreOpen] = useState(false);
  const [adminBannerDismissed, setAdminBannerDismissed] = useState(() => readMobileAdminBannerDismissed());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerNickname, setRegisterNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleRedirectPending, setGoogleRedirectPending] = useState(
    () =>
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1'
  );
  const [googleLinkPending, setGoogleLinkPending] = useState<GoogleLinkPending | null>(() =>
    loadPendingGoogleLink()
  );
  const [passwordResetResending, setPasswordResetResending] = useState(false);
  const [authActionParams, setAuthActionParams] = useState(() => parseAuthActionParams());
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowConnection, setSlowConnection] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem('dmx_category') || 'Todos');
  const categoryBeforeFavoritesTabRef = useRef(activeCategory);
  const [exerciseSortOrder, setExerciseSortOrder] = useState<ExerciseSortOrder>(() => readExerciseSortOrder());
  const catalogSortOrder: ExerciseSortOrder = isMobileLayout ? 'alpha' : exerciseSortOrder;
  const categoryBeforeSearchRef = useRef(activeCategory);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedNameId, setCopiedNameId] = useState<string | null>(null);
  const { filters: advancedFilters, setFilters: setAdvancedFilters, resetFilters: resetAdvancedFilters } =
    useAdvancedFilters();
  const [adminFilter, setAdminFilter] = useState<AdminFilter>('all');
  const [toast, setToast] = useState<ToastState>({ show: false, msg: '', type: 'success' });
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>('single');
  const [batchInput, setBatchInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [activeVideo, setActiveVideo] = useState<Exercise | null>(null);
  const [spotlightExerciseId, setSpotlightExerciseId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [compareEx, setCompareEx] = useState<Exercise | null>(null);
  const [comparePick, setComparePick] = useState<Exercise | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [playlistOrder, setPlaylistOrder] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('dmx_playlist_order');
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [adminUserPreview, setAdminUserPreview] = useState(false);
  const { history, recents, addSearch, addRecent, removeHistoryItem, clearHistory } =
    useSearchHistory();
  const {
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
  } = useSearchPreferences();
  const { favorites, toggle: toggleFavorite, isFavorite } = useFavorites(user?.uid);
  const [auditProgress, setAuditProgress] = useState(0);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStats, setAuditStats] = useState({ checked: 0, found: 0, missing: 0 });
  const [auditCurrentItem, setAuditCurrentItem] = useState('');
  const backgroundAuditRunning = useRef(false);
  const pendingAuditQueue = useRef(new Set<string>());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [videoLoop, setVideoLoop] = useState(false);
  const [videoAutoplay, setVideoAutoplay] = useState(true);
  const [compareLoopSync, setCompareLoopSync] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ name: '', details: '' });
  const [exerciseRequests, setExerciseRequests] = useState<ExerciseRequest[]>([]);
  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmail[]>([]);
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [appUsers, setAppUsers] = useState<UserProfile[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ webhookUrl: '' });
  const [heroSpotlight, setHeroSpotlight] = useState<HeroSpotlightSettings>(DEFAULT_HERO_SPOTLIGHT);
  const [form, setForm] = useState<ExerciseForm>(DEFAULT_FORM);
  const [exercisesPath, setExercisesPath] = useState<string[]>(() => getDbPath());
  const triedAlternateExercisesPath = useRef(false);
  const profileEverLoadedRef = useRef(false);
  const authFlowBusyRef = useRef(false);

  const pendingUsersCount = useMemo(() => {
    const pendingEmails = new Set(
      appUsers.filter((u) => u.status === 'pending').map((u) => u.email.trim().toLowerCase())
    );
    return pendingEmails.size;
  }, [appUsers]);
  const pendingRequestsCount = exerciseRequests.filter((r) => r.status === 'pending').length;

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, msg, type });
    toastTimeoutRef.current = setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  }, []);

  const finishGoogleSignIn = useCallback(
    async (signedInUser: User) => {
      const email = (signedInUser.email || '').trim().toLowerCase();
      if (email) {
        const lookup = await lookupAuthEmail(email);
        if (lookup?.exists && lookup.uid && lookup.uid !== signedInUser.uid) {
          await fb.signOut(auth);
          savePendingGoogleLink({ email, mode: 'retry-popup' });
          setGoogleLinkPending({ email, mode: 'retry-popup' });
          setLoginEmail(email);
          showToast(
            'Este e-mail já usa senha. Entre com sua senha abaixo para vincular o Google — sua senha continuará funcionando.',
            'error'
          );
          throw new Error('google-link-required');
        }
      }

      let profile: UserProfile;
      try {
        profile = await ensureUserProfile(signedInUser);
      } catch (profileErr) {
        const existing = await getUserProfileIfExists(signedInUser);
        if (!existing) throw profileErr;
        profile = existing;
      }
      if (profile.status === 'approved') {
        showToast('Login com Google realizado com sucesso!');
      } else {
        showToast('Conta conectada! Aguarde liberação manual do acesso.');
      }
      setUserProfile(profile);
      profileEverLoadedRef.current = true;
      if (profile.status !== 'approved') setProfileLoading(false);
      if (!signedInUser.emailVerified && signedInUser.email) {
        void requestEmailVerification(signedInUser.email, signedInUser.displayName || undefined);
      }
    },
    [showToast]
  );

  const beginGoogleLinkFlow = useCallback(
    (email: string, err: unknown) => {
      const parsed = parseGoogleLinkError(err);
      persistCredentialPending(email, parsed?.credential ?? null);
      const pending: GoogleLinkPending = {
        email,
        mode: parsed?.credential ? 'credential' : 'retry-popup',
        idToken: parsed?.credential
          ? (parsed.credential as { idToken?: string }).idToken
          : undefined,
        accessToken: parsed?.credential
          ? (parsed.credential as { accessToken?: string }).accessToken
          : undefined,
      };
      savePendingGoogleLink(pending);
      setGoogleLinkPending(pending);
      setLoginEmail(email);
      setAuthMode('login');
      showToast(
        'Este e-mail já possui conta com senha. Entre com sua senha para vincular o Google.',
        'error'
      );
    },
    [showToast]
  );

  const cancelGoogleLinkFlow = useCallback(() => {
    clearPendingGoogleLink();
    setGoogleLinkPending(null);
  }, []);

  const completePendingGoogleLink = useCallback(async () => {
    const pending = loadPendingGoogleLink();
    const current = auth.currentUser;
    if (!pending || !current?.email || current.email.trim().toLowerCase() !== pending.email) return;

    try {
      if (pending.mode === 'credential') {
        await linkGoogleCredentialToUser(current, pending);
      } else {
        await fb.linkWithPopup(current, fb.googleProvider);
      }
      clearPendingGoogleLink();
      setGoogleLinkPending(null);
      showToast('Google vinculado! Você pode entrar com senha ou Google.');
    } catch (linkErr) {
      const code = getAuthErrorCode(linkErr);
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        showToast('Login realizado. Toque em "Continuar com Google" novamente para vincular.', 'success');
      } else {
        showToast(
          'Entrou com senha, mas não foi possível vincular o Google. Tente "Continuar com Google" novamente.',
          'error'
        );
      }
      clearPendingGoogleLink();
      setGoogleLinkPending(null);
    }
  }, [showToast]);

  const openAdminTab = (tab: AdminTab) => {
    setEditingId(null);
    setAdminTab(tab);
    if (tab === 'single') setForm(DEFAULT_FORM);
    setShowAdminPanel(true);
  };

  const closeAdminPanel = () => {
    setShowAdminPanel(false);
    setEditingId(null);
    setAdminTab('batch');
    if (isMobileLayout && isAdmin && !adminUserPreview) {
      setAdminMobileTab('catalog');
    }
  };

  const stats = useMemo(() => {
    const total = exercises.length;
    const completed = exercises.filter((ex) => !isExerciseIncomplete(ex.youtubeUrl)).length;
    const pending = total - completed;
    const cloudMissing = exercises.filter(
      (ex) => !isExerciseIncomplete(ex.youtubeUrl) && ex.hasCloudVideo === false
    ).length;
    return { total, completed, pending, cloudMissing };
  }, [exercises]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (authLoading || loading) timer = setTimeout(() => setSlowConnection(true), 6000);
    else setSlowConnection(false);
    return () => clearTimeout(timer);
  }, [authLoading, loading]);

  useEffect(() => {
    localStorage.removeItem('dmx_search');
  }, []);

  useEffect(() => {
    localStorage.setItem('dmx_category', activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    localStorage.setItem(EXERCISE_SORT_STORAGE_KEY, exerciseSortOrder);
  }, [exerciseSortOrder]);

  useEffect(() => {
    if (isMobileLayout) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setShortcutsOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileLayout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAdminPanel) closeAdminPanel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAdminPanel]);

  useEffect(() => {
    if (!fb.isValid) {
      setGoogleRedirectPending(false);
      return;
    }
    let active = true;
    fb.getRedirectResult(auth)
      .then(async (result) => {
        if (!active || !result?.user) return;
        authFlowBusyRef.current = true;
        try {
          await finishGoogleSignIn(result.user);
        } catch (err) {
          if (err instanceof Error && err.message === 'google-link-required') return;
          showToast(getAuthErrorMessage(getAuthErrorCode(err), 'Erro ao entrar com Google.'), 'error');
        } finally {
          authFlowBusyRef.current = false;
        }
      })
      .catch((err) => {
        if (!active) return;
        const parsed = parseGoogleLinkError(err);
        if (parsed) {
          beginGoogleLinkFlow(parsed.email, err);
          return;
        }
        showToast(getAuthErrorMessage(getAuthErrorCode(err), 'Erro ao entrar com Google.'), 'error');
      })
      .finally(() => {
        if (active) {
          sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
          setGoogleRedirectPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [finishGoogleSignIn, showToast, beginGoogleLinkFlow]);

  useEffect(() => {
    if (!fb.isValid) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = fb.onAuthStateChanged(auth, (u) => {
      if (u) {
        const admin = ADMIN_EMAILS.includes(u.email || '');
        setIsLoggedIn(true);
        setUser(u);
        setIsAdmin(admin);
        setProfileLoading(!admin);
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setProfileLoading(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) {
      profileEverLoadedRef.current = false;
      return;
    }
    setProfileLoading(!isAdmin);
    const userProfileRef = fbDoc(db, ...getUserProfilePath(user.uid));

    const unsubProfile = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        profileEverLoadedRef.current = true;
        setUserProfile(profile);
        if (!isAdmin) setProfileLoading(false);

        if (!isAdmin && profile.status === 'pending') {
          void syncUserAccess(user, profile)
            .then((synced) => {
              if (synced.status !== profile.status) {
                setUserProfile(synced);
              }
            })
            .catch((e) => console.error('Erro ao sincronizar acesso', e));
        }
        return;
      }

      if (isAdmin || !user) return;

      if (profileEverLoadedRef.current) {
        profileEverLoadedRef.current = false;
        setUserProfile(null);
        void fb.signOut(auth).then(() => {
          showToast('Seu acesso foi revogado.', 'error');
        });
        if (!isAdmin) setProfileLoading(false);
        return;
      }

      void ensureUserProfile(user)
        .then((profile) => {
          profileEverLoadedRef.current = true;
          setUserProfile(profile);
          if (profile.status === 'pending') {
            showToast('Cadastro restaurado. Aguarde aprovação do administrador.');
          }
        })
        .catch(() => {
          void fb.signOut(auth).then(() => {
            showToast('Não foi possível restaurar seu cadastro. Entre em contato com o suporte.', 'error');
          });
        })
        .finally(() => {
          if (!isAdmin) setProfileLoading(false);
        });
    });

    return () => unsubProfile();
  }, [isLoggedIn, user, isAdmin, showToast]);

  useEffect(() => {
    if (!isLoggedIn || !user || isAdmin) return;
    const unsubToken = fb.onIdTokenChanged(auth, (u) => {
      if (!u) return;
      void (async () => {
        try {
          await u.getIdToken(true);
          const snap = await getDocFromServer(fbDoc(db, ...getUserProfilePath(u.uid)));
          if (!snap.exists()) {
            if (profileEverLoadedRef.current) {
              profileEverLoadedRef.current = false;
              setUserProfile(null);
              await fb.signOut(auth);
              showToast('Seu acesso foi revogado.', 'error');
            }
            return;
          }
          const profile = snap.data() as UserProfile;
          profileEverLoadedRef.current = true;
          setUserProfile(profile);
        } catch {
          if (!profileEverLoadedRef.current) return;
          profileEverLoadedRef.current = false;
          setUserProfile(null);
          await fb.signOut(auth);
          showToast('Sua sessão foi encerrada pelo administrador.', 'error');
        }
      })();
    });
    return () => unsubToken();
  }, [isLoggedIn, user, isAdmin, showToast]);

  useEffect(() => {
    if (!isAdmin && userProfile?.status === 'blocked') {
      setActiveVideo(null);
      setCompareEx(null);
    }
  }, [isAdmin, userProfile?.status]);

  useEffect(() => {
    if (!isLoggedIn || !user || !userProfile || isAdmin) return;
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    if (checkoutState !== 'success' && checkoutState !== 'cancel') return;

    const cleanCheckoutParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    };

    if (checkoutState === 'cancel') {
      cleanCheckoutParams();
      showToast('Pagamento cancelado.', 'error');
      return;
    }

    let cancelled = false;

    const syncAfterPayment = async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        try {
          const synced = await syncUserAccess(user, userProfile);
          if (synced.status === 'approved') {
            setUserProfile(synced);
            showToast('Pagamento confirmado! Bem-vindo à biblioteca.');
            cleanCheckoutParams();
            return;
          }
        } catch (e) {
          console.error('Erro ao sincronizar após checkout', e);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (!cancelled) {
        showToast(
          'Pagamento recebido! A liberação pode levar alguns instantes — aguarde ou atualize a página.',
          'error'
        );
        cleanCheckoutParams();
      }
    };

    void syncAfterPayment();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user, userProfile, isAdmin, showToast]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const settingsRef = fbDoc(db, ...getSettingsPath());
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (!snap.exists()) {
        setHeroSpotlight(DEFAULT_HERO_SPOTLIGHT);
        return;
      }
      const data = snap.data() as AppSettings;
      setHeroSpotlight(normalizeHeroSpotlight(data.heroSpotlight ?? DEFAULT_HERO_SPOTLIGHT));
      if (isAdmin) setAppSettings({ ...data, heroSpotlight: normalizeHeroSpotlight(data.heroSpotlight) });
    });
    return () => unsubSettings();
  }, [isLoggedIn, isAdmin]);

  const normalizeCoverNumber = (raw: unknown): number | undefined => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };

  const normalizeExerciseDoc = useCallback((docId: string, raw: Record<string, unknown>): Exercise => {
    const muscleGroups = normalizeMuscleGroups(
      parseCommaList(raw.muscleGroups as string | string[] | undefined)
    );
    const keywords = parseCommaList(raw.keywords as string | string[] | undefined);
    const equipment = normalizeEquipment(raw.equipment as string[] | string | undefined);
    const youtubeUrl = String(
      raw.youtubeUrl ||
        raw.youtube_url ||
        raw.youtubeURL ||
        raw.youtubeLink ||
        raw.youtube ||
        raw.videoUrl ||
        raw.url ||
        ''
    ).trim();

    return {
      firestoreId: docId,
      id: String(raw.id || docId),
      name: String(raw.name || ''),
      category: String(raw.category || ''),
      muscleGroups,
      youtubeUrl,
      thumbnail: raw.thumbnail ? String(raw.thumbnail) : undefined,
      keywords,
      equipment: equipment.length > 0 ? equipment : undefined,
      hasCloudVideo: raw.hasCloudVideo as boolean | null | undefined,
      videoOrientation: raw.videoOrientation ? String(raw.videoOrientation) : undefined,
      aspectRatio: raw.aspectRatio ? String(raw.aspectRatio) : undefined,
      coverFocusY: normalizeCoverNumber(raw.coverFocusY),
      coverFocusX: normalizeCoverNumber(raw.coverFocusX),
      coverZoom: normalizeCoverNumber(raw.coverZoom),
      createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    triedAlternateExercisesPath.current = false;
    setExercisesPath(getDbPath());
  }, [isLoggedIn, user?.uid]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;

    const tryAlternatePath = (currentPath: string[]): boolean => {
      if (triedAlternateExercisesPath.current) return false;
      const alternate = getAlternateExercisesPath(currentPath);
      if (alternate.join('/') === currentPath.join('/')) return false;
      triedAlternateExercisesPath.current = true;
      logWarn('Firestore', 'Tentando path alternativo:', alternate.join('/'));
      setExercisesPath(alternate);
      return true;
    };

    const path = exercisesPath;
    console.log('[DMX:Firestore] Escutando exercícios em:', path.join('/'));
    const collectionRef = fbCollection(db, ...path);
    const unsubExercises = onSnapshot(
      collectionRef,
      (snap) => {
        const data = snap.docs.map((d) => normalizeExerciseDoc(d.id, d.data() as Record<string, unknown>));
        data.sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true }));

        logDebug('Firestore', `${data.length} exercício(s) em ${path.join('/')}`);

        if (data.length === 0 && tryAlternatePath(path)) return;

        const withYoutube = data.filter((ex) => !isExerciseIncomplete(ex.youtubeUrl)).length;
        logDebug('Firestore', `${withYoutube}/${data.length} com YouTube válido`);

        setExercises(data);
        const publicReady = data
          .filter((ex) => !isExerciseIncomplete(ex.youtubeUrl))
          .map((ex) => ({ firestoreId: ex.firestoreId, id: ex.id }));
        primeCoversFromExerciseList(
          isMobileUi()
            ? publicReady.slice(0, isAdmin ? 8 : 10)
            : isAdmin
              ? publicReady.slice(0, 24)
              : publicReady
        );
        setLoading(false);
      },
      (err) => {
        const code = (err as { code?: string }).code;
        logError('Firestore', 'Erro ao carregar exercícios:', {
          code,
          message: err.message,
          path: path.join('/'),
        });
        console.error('[DMX:Firestore] Erro:', code, err.message, 'path:', path.join('/'));

        if (code === 'permission-denied') {
          logError(
            'Firestore',
            'Permissão negada. Verifique Firestore Rules para usuários autenticados em:',
            path.join('/')
          );
        }

        if (tryAlternatePath(path)) return;

        setLoading(false);
      }
    );

    const notifRef = fbCollection(db, ...getNotifPath());
    const unsubNotif = onSnapshot(notifRef, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[];
      const myData = data.filter((n) => !n.targetUserId || n.targetUserId === user.uid);
      myData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(myData);
    });

    const userDocRef = fbDoc(db, ...getUserNotifSettingsPath(user.uid));
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLastReadAt(data.lastReadAt);
        setClearedAt(data.clearedAt || null);
      } else {
        const now = new Date().toISOString();
        setDoc(userDocRef, { lastReadAt: now, clearedAt: now }, { merge: true });
        setLastReadAt(now);
        setClearedAt(now);
      }
    });

    const playbackDocRef = fbDoc(db, ...getUserPlaybackSettingsPath(user.uid));
    const unsubPlayback = onSnapshot(playbackDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVideoLoop(data.videoLoop === true);
        setVideoAutoplay(data.videoAutoplay !== false);
        setCompareLoopSync(data.videoLoop === true && data.compareLoopSync === true);
      } else {
        setVideoLoop(false);
        setVideoAutoplay(true);
        setCompareLoopSync(false);
      }
    });

    return () => {
      unsubExercises();
      unsubNotif();
      unsubUser();
      unsubPlayback();
    };
  }, [isLoggedIn, user, exercisesPath, normalizeExerciseDoc, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const usersRef = fbCollection(db, ...getUsersPath());
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const users = snap.docs.map((d) => d.data()) as UserProfile[];
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAppUsers(users);
    });

    const reqRef = fbCollection(db, ...getRequestsPath());
    const unsubReqs = onSnapshot(reqRef, (snap) => {
      const reqs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ExerciseRequest[];
      reqs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setExerciseRequests(reqs);
    });

    const authRef = fbCollection(db, ...getAuthorizedPath());
    const unsubAuth = onSnapshot(authRef, (snap) => {
      const emails = snap.docs.map((d) => d.data()) as AuthorizedEmail[];
      emails.sort((a, b) => new Date(b.authorizedAt || '').getTime() - new Date(a.authorizedAt || '').getTime());
      setAuthorizedEmails(emails);
    });
    return () => {
      unsubUsers();
      unsubReqs();
      unsubAuth();
    };
  }, [isAdmin]);

  useEffect(() => {
    const cloudAuditActive =
      isAdmin &&
      !adminUserPreview &&
      (adminFilter === 'missing_cloud' || adminFilter === 'upados_cloud');

    if (!cloudAuditActive || exercises.length === 0 || isCoarsePointer()) return;

    let cancelled = false;

    const processQueue = async () => {
      if (backgroundAuditRunning.current) return;
      backgroundAuditRunning.current = true;
      const needsCheck = exercises.filter(
        (ex) =>
          !isExerciseIncomplete(ex.youtubeUrl) &&
          ex.hasCloudVideo !== true &&
          !pendingAuditQueue.current.has(ex.id)
      );
      for (const ex of needsCheck) {
        if (cancelled) break;
        pendingAuditQueue.current.add(ex.id);
        const gcpApiUrl = `https://storage.googleapis.com/storage/v1/b/biblioteca-dmx-videos-oficiais/o/${ex.id}_4K.mp4`;
        let isUpado = false;
        try {
          const response = await fetch(gcpApiUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          if (response.ok) isUpado = true;
        } catch {
          if (!navigator.onLine) break;
        }
        if (isUpado !== ex.hasCloudVideo) {
          const docRef = fbDoc(db, ...getDbPath(), ex.firestoreId);
          try {
            await updateDoc(docRef, { hasCloudVideo: isUpado });
          } catch {
            /* ignore */
          }
        }
        await new Promise((r) => setTimeout(r, 6000));
      }
      backgroundAuditRunning.current = false;
    };

    const timer = window.setTimeout(() => {
      void processQueue();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [exercises, isAdmin, adminFilter, adminUserPreview]);

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => !clearedAt || n.createdAt > clearedAt),
    [notifications, clearedAt]
  );

  const unreadCount = useMemo(() => {
    if (!lastReadAt) return 0;
    return visibleNotifications.filter((n) => n.createdAt > lastReadAt).length;
  }, [visibleNotifications, lastReadAt]);

  const toggleNotifications = async () => {
    const willOpen = !showNotifications;
    setShowNotifications(willOpen);
    if (!willOpen && unreadCount > 0 && user) {
      try {
        const userDocRef = fbDoc(db, ...getUserNotifSettingsPath(user.uid));
        await setDoc(userDocRef, { lastReadAt: new Date().toISOString() }, { merge: true });
      } catch (e) {
        console.error('Erro leitura:', e);
      }
    }
  };

  const closeNotifications = () => {
    if (showNotifications) void toggleNotifications();
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    try {
      const userDocRef = fbDoc(db, ...getUserNotifSettingsPath(user.uid));
      const now = new Date().toISOString();
      await setDoc(userDocRef, { clearedAt: now, lastReadAt: now }, { merge: true });
      setShowNotifications(false);
      showToast('Notificações limpas.');
    } catch (e) {
      console.error('Erro ao limpar:', e);
    }
  };

  const handleNotificationClick = (exerciseId?: string) => {
    if (!exerciseId) return;
    setActiveCategory('Todos');
    setSearchTerm(exerciseId);
    setShowNotifications(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setUserAccessStatus = async (uid: string, status: UserProfile['status']) => {
    try {
      try {
        await adminSetUserStatus(uid, status);
      } catch (apiErr) {
        console.warn('API admin indisponível, usando Firestore direto.', apiErr);
        await updateDoc(fbDoc(db, ...getUserProfilePath(uid)), { status });
      }
      const labels: Record<UserProfile['status'], string> = {
        approved: 'aprovado',
        pending: 'pendente',
        blocked: 'bloqueado',
      };
      showToast(`Acesso alterado para: ${labels[status]}`);
    } catch (e) {
      console.error('Erro ao alterar acesso', e);
      showToast('Erro ao alterar acesso', 'error');
    }
  };

  const deleteUserProfileAdmin = async (uid: string) => {
    if (
      !confirm(
        'Remover este registro? O aluno perderá acesso imediatamente. Ele poderá solicitar acesso novamente ao fazer login.'
      )
    ) {
      return;
    }
    try {
      try {
        await adminRemoveUserProfile(uid);
      } catch (apiErr) {
        console.warn('API admin indisponível, usando Firestore direto.', apiErr);
        await deleteDoc(fbDoc(db, ...getUserProfilePath(uid)));
      }
      showToast('Registro removido. O aluno pode voltar a solicitar acesso ao fazer login.');
    } catch (e) {
      console.error('Erro ao remover usuário', e);
      showToast('Erro ao remover registro', 'error');
    }
  };

  const removeDuplicateUserProfiles = async (uids: string[]) => {
    if (uids.length === 0) return;
    if (!confirm(`Remover ${uids.length} registro(s) duplicado(s)?`)) return;
    try {
      const batch = writeBatch(db);
      for (const uid of uids) {
        batch.delete(fbDoc(db, ...getUserProfilePath(uid)));
      }
      await batch.commit();
      showToast(`${uids.length} duplicata(s) removida(s).`);
    } catch (e) {
      console.error('Erro ao remover duplicatas', e);
      showToast('Erro ao remover duplicatas', 'error');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const settingsRef = fbDoc(db, ...getSettingsPath());
      await setDoc(settingsRef, appSettings, { merge: true });
      showToast('Configurações do Webhook salvas!');
    } catch {
      showToast('Erro ao salvar', 'error');
    }
  };

  const runCloudAudit = async () => {
    const exercisesToAudit = exercises.filter((ex) => !isExerciseIncomplete(ex.youtubeUrl));
    if (exercisesToAudit.length === 0) {
      showToast('Não há exercícios preenchidos para auditar.', 'error');
      return;
    }
    if (!confirm(`O sistema já audita silenciosamente. Deseja forçar agora para ${exercisesToAudit.length} exercícios?`))
      return;
    setIsAuditing(true);
    setAuditProgress(0);
    let found = 0;
    let missing = 0;
    let checked = 0;
    let batch = writeBatch(db);
    let batchCount = 0;
    for (let i = 0; i < exercisesToAudit.length; i++) {
      const ex = exercisesToAudit[i];
      setAuditCurrentItem(ex.id);
      let isUpado = false;
      if (ex.id) {
        const gcpApiUrl = `https://storage.googleapis.com/storage/v1/b/biblioteca-dmx-videos-oficiais/o/${ex.id}_4K.mp4`;
        try {
          const response = await fetch(gcpApiUrl, {
            method: 'GET',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          if (response.ok) isUpado = true;
        } catch {
          if (!navigator.onLine) {
            showToast('Auditoria interrompida: Falha de rede.', 'error');
            setIsAuditing(false);
            return;
          }
        }
      }
      if (isUpado) found++;
      else missing++;
      if (ex.hasCloudVideo !== isUpado) {
        const docRef = fbDoc(db, ...getDbPath(), ex.firestoreId);
        batch.update(docRef, { hasCloudVideo: isUpado });
        batchCount++;
        if (batchCount === 450) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
      checked++;
      setAuditStats({ checked, found, missing });
      setAuditProgress(Math.round((checked / exercisesToAudit.length) * 100));
      await new Promise((r) => setTimeout(r, 60));
    }
    if (batchCount > 0) await batch.commit();
    setAuditCurrentItem('');
    setIsAuditing(false);
    showToast('Auditoria manual concluída com sucesso!');
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !requestForm.name.trim()) return;
    try {
      await addDoc(fbCollection(db, ...getRequestsPath()), {
        exerciseName: requestForm.name,
        details: requestForm.details,
        userId: user.uid,
        userName: userProfile?.name || user.displayName || 'Aluno',
        userEmail: userProfile?.email || user.email || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      showToast('Sugestão enviada com sucesso! Obrigado.');
      setShowRequestModal(false);
      setRequestForm({ name: '', details: '' });
    } catch {
      showToast('Erro ao enviar sugestão.', 'error');
    }
  };

  const markRequestAsDoneAndNotify = async (req: ExerciseRequest) => {
    try {
      await addDoc(fbCollection(db, ...getNotifPath()), {
        title: 'SEU PEDIDO FOI GRAVADO! 🎉',
        message: `O exercício "${req.exerciseName}" que você sugeriu acabou de chegar na biblioteca.`,
        thumbnail: CUSTOM_LOGO_URL,
        type: 'request_fulfilled',
        targetUserId: req.userId,
        createdAt: new Date().toISOString(),
      });
      if (req.userEmail) {
        void sendTransactionalEmail({
          type: 'request_fulfilled',
          to: req.userEmail,
          data: { studentName: req.userName ?? '', exerciseName: req.exerciseName ?? '' },
        });
      }
      if (appSettings?.webhookUrl) {
        try {
          fetch(appSettings.webhookUrl, {
            method: 'POST',
            body: JSON.stringify({
              event: 'request_fulfilled',
              student_email: req.userEmail,
              student_name: req.userName,
              exercise_name: req.exerciseName,
            }),
          });
        } catch {
          /* ignore */
        }
      }
      const docRef = fbDoc(db, ...getRequestsPath(), req.id);
      await deleteDoc(docRef);
      showToast('Pedido gravado com sucesso e aluno notificado!');
    } catch {
      showToast('Erro ao processar o pedido.', 'error');
    }
  };

  const deleteRequest = async (reqId: string) => {
    if (!confirm('Excluir esta sugestão sem notificar o aluno?')) return;
    try {
      const docRef = fbDoc(db, ...getRequestsPath(), reqId);
      await deleteDoc(docRef);
      showToast('Sugestão excluída.');
    } catch {
      showToast('Erro ao excluir.', 'error');
    }
  };

  const handleAddAuthEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthEmail.trim()) return;
    const emailClean = newAuthEmail.trim().toLowerCase();
    try {
      const docRef = fbDoc(db, ...getAuthorizedPath(), emailClean);
      await setDoc(docRef, {
        email: emailClean,
        source: 'manual_admin',
        accessStatus: 'active',
        authorizedAt: new Date().toISOString(),
      });
      setNewAuthEmail('');
      showToast('E-mail pré-autorizado com sucesso!');
    } catch {
      showToast('Erro ao pré-autorizar e-mail.', 'error');
    }
  };

  const handleRemoveAuthEmail = async (email: string) => {
    if (!confirm(`Remover autorização para ${email}?`)) return;
    try {
      const docRef = fbDoc(db, ...getAuthorizedPath(), email);
      await deleteDoc(docRef);
      showToast('Autorização revogada.');
    } catch {
      showToast('Erro ao revogar autorização.', 'error');
    }
  };

  const deliverPasswordResetEmail = useCallback(async (email: string): Promise<AuthEmailResult> => {
    const result = await requestPasswordReset(email);
    if (result.ok) return result;
    await fb.sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/`,
      handleCodeInApp: true,
    });
    return {
      ok: true,
      message:
        'Se o e-mail estiver cadastrado, enviamos o link de recuperação. Verifique a caixa de entrada e o spam.',
    };
  }, []);

  const handleResendPasswordReset = useCallback(async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!email || passwordResetResending) return;
    setPasswordResetResending(true);
    try {
      const result = await deliverPasswordResetEmail(email);
      if (!result.ok) {
        showToast(result.error || 'Não foi possível reenviar o e-mail.', 'error');
      }
    } catch {
      showToast('Não foi possível reenviar o e-mail. Tente novamente.', 'error');
    } finally {
      setPasswordResetResending(false);
    }
  }, [loginEmail, passwordResetResending, deliverPasswordResetEmail, showToast]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authSubmitting) return;

    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      showToast('Informe seu e-mail.', 'error');
      return;
    }

    setAuthSubmitting(true);
    authFlowBusyRef.current = true;
    try {
      if (authMode === 'login') {
        const lookup = await lookupAuthEmail(email);
        if (lookup && !lookup.exists) {
          showToast(getNotRegisteredMessage(), 'error');
          return;
        }
        await fb.signInWithEmailAndPassword(auth, email, loginPassword);
        await completePendingGoogleLink();
      } else if (authMode === 'forgot') {
        const result = await deliverPasswordResetEmail(email);
        if (result.ok) {
          setAuthMode('forgot-sent');
        } else {
          showToast(result.error || 'Não foi possível enviar o e-mail.', 'error');
        }
      } else {
        if (!registerName.trim()) {
          showToast('Por favor, digite o seu nome completo.', 'error');
          return;
        }
        const nicknameError = validateNickname(registerNickname);
        if (nicknameError) {
          showToast(nicknameError, 'error');
          return;
        }
        const normalizedNickname = normalizeNickname(registerNickname);
        if (loginPassword !== registerPasswordConfirm) {
          showToast('As senhas não coincidem.', 'error');
          return;
        }
        if (loginPassword.length < 6) {
          showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
          return;
        }

        const authRef = fbDoc(db, ...getAuthorizedPath(), email);
        const authSnap = await getDoc(authRef);
        const isPreAuthorized =
          authSnap.exists() && isAuthorizedEmailActive(authSnap.data() as AuthorizedEmail);
        const finalStatus = isPreAuthorized ? 'approved' : 'pending';
        const userCredential = await fb.createUserWithEmailAndPassword(auth, email, loginPassword);
        await fb.updateProfile(userCredential.user, { displayName: registerName.trim() });
        const userProfileRef = fbDoc(db, ...getUserProfilePath(userCredential.user.uid));
        const newProfile: UserProfile = {
          uid: userCredential.user.uid,
          email,
          name: registerName.trim(),
          nickname: normalizedNickname,
          status: finalStatus,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userProfileRef, newProfile);
        profileEverLoadedRef.current = true;
        setUserProfile(newProfile);
        setProfileLoading(false);
        void requestEmailVerification(email, registerName.trim());
        showToast(
          isPreAuthorized
            ? 'Acesso liberado! Enviamos um e-mail para confirmar seu endereço.'
            : 'Conta criada! Confirme seu e-mail e aguarde liberação manual.'
        );
      }
    } catch (err) {
      const code = getAuthErrorCode(err);
      if (authMode === 'login' && isLoginCredentialError(code)) {
        const lookup = await lookupAuthEmail(email);
        showToast(getEmailPasswordLoginMessage(lookup), 'error');
      } else if (authMode === 'register' && code === 'auth/email-already-in-use') {
        const lookup = await lookupAuthEmail(email);
        showToast(getRegisterBlockedMessage(lookup) ?? 'Este e-mail já está cadastrado.', 'error');
      } else {
        showToast(
          getAuthErrorMessage(
            code,
            authMode === 'login'
              ? 'E-mail ou senha incorretos.'
              : authMode === 'forgot'
                ? 'Erro ao tentar enviar e-mail. Verifique o endereço.'
                : 'Erro ao criar conta. Tente novamente.'
          ),
          'error'
        );
      }
    } finally {
      authFlowBusyRef.current = false;
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleSubmitting || authSubmitting) return;
    setGoogleSubmitting(true);
    authFlowBusyRef.current = true;
    try {
      const hint = loginEmail.trim().toLowerCase();
      fb.googleProvider.setCustomParameters(
        hint ? { prompt: 'select_account', login_hint: hint } : { prompt: 'select_account' }
      );

      if (isMobileUi()) {
        sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
        await fb.signInWithRedirect(auth, fb.googleProvider);
        return;
      }
      const result = await fb.signInWithPopup(auth, fb.googleProvider);
      await finishGoogleSignIn(result.user);
    } catch (err) {
      if (err instanceof Error && err.message === 'google-link-required') return;
      const parsed = parseGoogleLinkError(err);
      if (parsed) {
        beginGoogleLinkFlow(parsed.email, err);
        return;
      }
      showToast(getAuthErrorMessage(getAuthErrorCode(err), 'Erro ao entrar com Google.'), 'error');
    } finally {
      authFlowBusyRef.current = false;
      setGoogleSubmitting(false);
    }
  };

  const handleUpdateVideoLoop = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      setVideoLoop(enabled);
      if (!enabled) setCompareLoopSync(false);
      try {
        const playbackDocRef = fbDoc(db, ...getUserPlaybackSettingsPath(user.uid));
        await setDoc(
          playbackDocRef,
          enabled
            ? { videoLoop: true }
            : { videoLoop: false, compareLoopSync: false },
          { merge: true }
        );
      } catch {
        setVideoLoop(!enabled);
        if (enabled) setCompareLoopSync(false);
        showToast('Não foi possível salvar a preferência de reprodução.', 'error');
      }
    },
    [user, showToast]
  );

  const handleUpdateVideoAutoplay = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      setVideoAutoplay(enabled);
      try {
        const playbackDocRef = fbDoc(db, ...getUserPlaybackSettingsPath(user.uid));
        await setDoc(playbackDocRef, { videoAutoplay: enabled }, { merge: true });
      } catch {
        setVideoAutoplay(!enabled);
        showToast('Não foi possível salvar a preferência de reprodução.', 'error');
      }
    },
    [user, showToast]
  );

  const handleUpdateCompareLoopSync = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      setCompareLoopSync(enabled);
      try {
        const playbackDocRef = fbDoc(db, ...getUserPlaybackSettingsPath(user.uid));
        await setDoc(playbackDocRef, { compareLoopSync: enabled }, { merge: true });
      } catch {
        setCompareLoopSync(!enabled);
        showToast('Não foi possível salvar a preferência do comparador.', 'error');
      }
    },
    [user, showToast]
  );

  const handleExerciseSortOrderChange = useCallback((order: ExerciseSortOrder) => {
    setExerciseSortOrder(order);
    localStorage.setItem(EXERCISE_SORT_STORAGE_KEY, order);
  }, []);

  const handleResendVerification = useCallback(async () => {
    if (!user?.email) throw new Error('Sem e-mail');
    const result = await requestEmailVerification(user.email, user.displayName || userProfile?.name);
    if (result.ok) {
      showToast(result.message || 'E-mail de verificação enviado. Verifique a caixa de entrada.');
    } else {
      showToast(result.error || 'Não foi possível enviar o e-mail.', 'error');
      throw new Error(result.error);
    }
  }, [user, userProfile?.name, showToast]);

  const handleUpdateNickname = useCallback(
    async (nickname: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      setUserProfile((prev) => (prev ? { ...prev, nickname } : prev));
      const userProfileRef = fbDoc(db, ...getUserProfilePath(user.uid));
      await updateDoc(userProfileRef, { nickname });
    },
    [user]
  );

  const handleLogout = useCallback(() => {
    void fb.signOut(auth).then(() => {
      localStorage.removeItem('dmx_search');
      localStorage.removeItem('dmx_category');
      setSearchTerm('');
      setActiveCategory('Todos');
    }).catch(() => {
      showToast('Não foi possível encerrar a sessão. Tente novamente.', 'error');
    });
  }, [showToast]);


  const downloadExercise = async (ex: Exercise) => {
    const quality = '4K';
    const filename = sanitizeDownloadFilename(ex.name, quality);
    const metadataUrl = buildGcsVideoMetadataUrl(ex.id, quality);
    showToast('Verificando disponibilidade de dados...');
    try {
      const response = await fetch(metadataUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        showToast('Iniciando download...');
        triggerBrowserDownload(buildGcsVideoDownloadUrl(ex.id, quality, filename), filename);
      } else {
        showToast(`O vídeo "${ex.name}" ainda não está disponível em ${quality}.`, 'error');
      }
    } catch {
      if (navigator.onLine)
        showToast(`O vídeo "${ex.name}" ainda não está disponível em ${quality}.`, 'error');
      else showToast('Falha de conexão à internet.', 'error');
    }
  };

  const handleDownloadCheck = async (e: React.MouseEvent, ex: Exercise) => {
    e.stopPropagation();
    await downloadExercise(ex);
  };

  const showAdminUI = isAdmin && !adminUserPreview;
  const useMobileShell = isMobileLayout && !showAdminUI;
  const useMobileAdminShell =
    isMobileLayout && showAdminUI && isFeatureEnabled('adminStudio');
  const showAdminMobileDisabled =
    isMobileLayout && showAdminUI && !isFeatureEnabled('adminStudio');
  const mobileFilterActiveCount = countActiveAdvancedFilterGroups(advancedFilters);
  const { catalogView, setCatalogView } = useMobileCatalogView();
  useMobileHeaderCollapse(useMobileShell || useMobileAdminShell);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (useMobileShell) {
      document.documentElement.setAttribute('data-mobile-shell', 'true');
    } else {
      document.documentElement.removeAttribute('data-mobile-shell');
    }
    if (useMobileAdminShell) {
      document.documentElement.setAttribute('data-mobile-admin-shell', 'true');
    } else {
      document.documentElement.removeAttribute('data-mobile-admin-shell');
    }
  }, [useMobileShell, useMobileAdminShell]);

  useEffect(() => {
    if (useMobileShell) {
      setSelectionMode(false);
    }
  }, [useMobileShell]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (useMobileShell) {
      document.documentElement.removeAttribute('data-mobile-playlist-active');
      return;
    }
    const active = selectionMode || playlistOrder.length > 0;
    if (active) {
      document.documentElement.setAttribute('data-mobile-playlist-active', 'true');
    } else {
      document.documentElement.removeAttribute('data-mobile-playlist-active');
    }
  }, [useMobileShell, selectionMode, playlistOrder.length]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!useMobileShell) {
      document.documentElement.removeAttribute('data-mobile-playback-active');
      return;
    }
    if (activeVideo) {
      document.documentElement.setAttribute('data-mobile-playback-active', 'true');
    } else {
      document.documentElement.removeAttribute('data-mobile-playback-active');
    }
  }, [useMobileShell, activeVideo]);

  useEffect(() => {
    if (!activeVideo) return;
    lockAppUrl();
  }, [activeVideo]);

  useEffect(() => {
    const onRestore = () => {
      lockAppUrl();
      const current = auth.currentUser;
      if (current) void current.getIdToken(true).catch(() => {});
    };
    window.addEventListener('dmx:bfcache-restore', onRestore);
    return () => window.removeEventListener('dmx:bfcache-restore', onRestore);
  }, []);

  useEffect(() => {
    if (!useMobileShell && !useMobileAdminShell) return;
    primeYouTubePlayerApi();
  }, [useMobileShell, useMobileAdminShell]);

  /** Exercícios visíveis para alunos — somente com YouTube válido, na ordem escolhida */
  const publicExercises = useMemo(() => {
    const list = exercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl));
    return [...list].sort((a, b) => compareExercisesBySortOrder(a, b, catalogSortOrder));
  }, [exercises, catalogSortOrder]);

  const searchableExercises = useMemo(
    () => (showAdminUI ? exercises : publicExercises),
    [exercises, publicExercises, showAdminUI]
  );

  const playlist = useMemo(() => {
    const byId = new Map(exercises.map((ex) => [ex.firestoreId, ex]));
    return playlistOrder.map((id) => byId.get(id)).filter((ex): ex is Exercise => !!ex);
  }, [playlistOrder, exercises]);

  const playlistSelection = useMemo(
    () => buildPlaylistSelectionLookup(playlistOrder),
    [playlistOrder]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('dmx_playlist_order', JSON.stringify(playlistOrder));
      } catch {
        /* quota / private mode */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [playlistOrder]);

  const searchIndexes = useMemo(
    () => searchableExercises.map(buildExerciseSearchIndex),
    [searchableExercises]
  );

  const coverProbeEnabled = showAdminUI && adminFilter === 'missing_cover';
  const { probeMap, loading: coverProbeLoading, progress: coverProbeProgress } =
    useGitHubCoverProbe(exercises, coverProbeEnabled);

  const validExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const youtubeOk = hasValidYouTubeUrl(ex.youtubeUrl);
      if (showAdminUI) {
        if (adminFilter === 'completed') return youtubeOk;
        if (adminFilter === 'incomplete') return !youtubeOk;
        if (adminFilter === 'missing_cloud') return youtubeOk && ex.hasCloudVideo === false;
        if (adminFilter === 'upados_cloud') return youtubeOk && ex.hasCloudVideo === true;
        if (adminFilter === 'missing_cover') {
          if (!youtubeOk) return false;
          const needs = resolveNeedsGitHubCover(ex, probeMap, !coverProbeLoading);
          return needs === true;
        }
        return true;
      }
      return youtubeOk;
    });
  }, [exercises, showAdminUI, adminFilter, probeMap, coverProbeLoading]);

  const categoryFiltered = useMemo(
    () => filterExercisesByCategory(validExercises, activeCategory, favorites),
    [validExercises, activeCategory, favorites]
  );

  const exerciseSearchPool = useMemo(
    () =>
      getSearchPool(
        validExercises,
        categoryFiltered,
        publicExercises,
        activeCategory,
        advancedFilters.favoritesOnly,
        favorites,
        showAdminUI
      ),
    [
      validExercises,
      categoryFiltered,
      publicExercises,
      activeCategory,
      advancedFilters.favoritesOnly,
      favorites,
      showAdminUI,
    ]
  );

  const filteredExercises = useMemo(() => {
    const searched = !searchTerm.trim()
      ? categoryFiltered
      : (() => {
          const indexById = new Map(searchIndexes.map((idx) => [idx.exercise.firestoreId, idx]));
          const scopedIndexes = exerciseSearchPool
            .map((ex) => indexById.get(ex.firestoreId))
            .filter((idx): idx is NonNullable<typeof idx> => !!idx);

          return rankExercises(scopedIndexes, searchTerm).map((r) => r.exercise);
        })();

    const filtered = applyAdvancedFilters(searched, advancedFilters, favorites);
    return [...filtered].sort((a, b) => {
      if (searchTerm.trim() || showAdminUI) return 0;
      return compareExercisesBySortOrder(a, b, catalogSortOrder);
    });
  }, [
    searchTerm,
    categoryFiltered,
    exerciseSearchPool,
    searchIndexes,
    advancedFilters,
    favorites,
    showAdminUI,
    catalogSortOrder,
  ]);

  const searchSuggestions = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    const indexById = new Map(searchIndexes.map((idx) => [idx.exercise.firestoreId, idx]));
    const scopedIndexes = exerciseSearchPool
      .map((ex) => indexById.get(ex.firestoreId))
      .filter((idx): idx is NonNullable<typeof idx> => !!idx);
    return rankExercises(scopedIndexes, searchTerm)
      .slice(0, 6)
      .map((r) => r.exercise);
  }, [searchTerm, exerciseSearchPool, searchIndexes]);

  const publicExerciseIds = useMemo(
    () => new Set(publicExercises.map((ex) => ex.firestoreId)),
    [publicExercises]
  );

  const visibleRecents = useMemo(() => {
    if (!saveRecentVideos) return [];
    return recents.filter((r) => publicExerciseIds.has(r.firestoreId) || showAdminUI);
  }, [recents, publicExerciseIds, showAdminUI, saveRecentVideos]);

  const visibleSearchHistory = useMemo(
    () => (saveSearchHistory ? history : []),
    [history, saveSearchHistory]
  );

  const heroDisplay = useMemo(
    () => resolveHeroDisplay(exercises, heroSpotlight),
    [exercises, heroSpotlight]
  );

  const gridExercises = useMemo(() => {
    if (searchTerm.trim() || activeCategory !== 'Todos') {
      return filteredExercises;
    }
    const heroExId = heroDisplay?.exercise?.firestoreId;
    if (!heroExId || heroDisplay.mode === 'campaign') {
      return filteredExercises;
    }
    return filteredExercises.filter((ex) => ex.firestoreId !== heroExId);
  }, [filteredExercises, heroDisplay, searchTerm, activeCategory, catalogSortOrder]);

  const gridExerciseIds = useMemo(
    () => gridExercises.map((ex) => ex.firestoreId),
    [gridExercises]
  );

  const gridMembershipKey = useMemo(() => [...gridExerciseIds].sort().join('|'), [gridExerciseIds]);

  const gridOrderKey = gridExerciseIds.join('|');

  const gridMembershipRef = useRef<string | null>(null);

  const emptyStateVariant = useMemo(() => {
    if (hasActiveAdvancedFilters(advancedFilters)) return 'filters' as const;
    if (searchTerm.trim()) return 'search' as const;
    if (activeCategory === 'Favoritos') return 'favorites' as const;
    return 'category' as const;
  }, [searchTerm, activeCategory, advancedFilters]);

  const handleEmptyClearFilters = useCallback(() => {
    setSearchTerm('');
    setActiveCategory('Todos');
    resetAdvancedFilters();
  }, [resetAdvancedFilters]);

  const handleGoHome = useCallback(() => {
    setSearchTerm('');
    setActiveCategory('Todos');
    resetAdvancedFilters();
    setMobileTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [resetAdvancedFilters]);

  const handleMobileBrandPress = useCallback(() => {
    if (activeVideo) {
      setActiveVideo(null);
      setCompareEx(null);
    }
    if (selectionMode) {
      setSelectionMode(false);
      if (playlistOrder.length > 0) {
        setPlaylistOrder([]);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    setSearchTerm('');
    setActiveCategory('Todos');
    resetAdvancedFilters();
    setMobileTab('home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeVideo, selectionMode, playlistOrder.length, resetAdvancedFilters]);

  const handleMobileTabChange = useCallback(
    (tab: MobileTab) => {
      if (activeVideo) {
        setActiveVideo(null);
        setCompareEx(null);
      }
      setMobileTab(tab);
      if (tab === 'favorites') {
        categoryBeforeFavoritesTabRef.current = activeCategory;
        setActiveCategory('Favoritos');
        setSearchTerm('');
        setSelectionMode(false);
      } else if (tab === 'home') {
        if (activeCategory === 'Favoritos') {
          setActiveCategory(categoryBeforeFavoritesTabRef.current || 'Todos');
        }
      } else if (tab === 'workout') {
        setSearchTerm('');
        if (activeCategory === 'Favoritos') {
          setActiveCategory(categoryBeforeFavoritesTabRef.current || 'Todos');
        }
      } else if (tab === 'account') {
        setSelectionMode(false);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    },
    [activeCategory, activeVideo]
  );

  const handleMobileAddToWorkout = useCallback(() => {
    setSelectionMode(true);
    setMobileTab('home');
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const handleAdminMobileTabChange = useCallback((tab: MobileAdminTab) => {
    setAdminMobileTab(tab);
    if (tab === 'users') {
      setEditingId(null);
      setAdminTab('users');
      setShowAdminPanel(true);
    } else if (tab === 'requests') {
      setEditingId(null);
      setAdminTab('requests');
      setShowAdminPanel(true);
    } else if (tab === 'more') {
      setAdminMoreOpen(true);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  const dismissAdminBanner = useCallback(() => {
    setAdminBannerDismissed(true);
    localStorage.setItem(MOBILE_ADMIN_BANNER_DISMISSED_KEY, 'true');
  }, []);

  const handleSearchCommit = useCallback(
    (term: string) => {
      if (saveSearchHistory) addSearch(term);
    },
    [addSearch, saveSearchHistory]
  );

  const handleGoToTodosKeepSearch = useCallback(() => {
    setActiveCategory('Todos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      if (useMobileShell && value.trim() && mobileTab === 'workout') {
        setMobileTab('home');
      }
      setSearchTerm((prev) => {
        if (!prev.trim() && value.trim()) {
          categoryBeforeSearchRef.current = activeCategory;
        }
        return value;
      });
    },
    [activeCategory, mobileTab, useMobileShell]
  );

  const handleSelectSearchHistory = useCallback(
    (term: string) => {
      setSearchTerm((prev) => {
        if (!prev.trim() && term.trim()) {
          categoryBeforeSearchRef.current = activeCategory;
        }
        return term;
      });
    },
    [activeCategory]
  );

  const handleCategoryChange = useCallback((cat: string) => {
    setSearchTerm('');
    setActiveCategory(cat);
  }, []);

  const handleSearchScreenCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat);
  }, []);

  const handleSearchEscapeBack = useCallback(() => {
    setSearchTerm('');
    setActiveCategory(categoryBeforeSearchRef.current || 'Todos');
  }, []);

  const isEmptySearchState =
    !loading && !!searchTerm.trim() && filteredExercises.length === 0 && emptyStateVariant === 'search';

  useEffect(() => {
    if (isMobileLayout) return;
    const blocked = () =>
      !!(activeVideo || showAdminPanel || shortcutsOpen || comparePick);

    const onKey = (e: KeyboardEvent) => {
      if (blocked()) return;

      if (isCatalogShortcutMod(e) && isBackquoteKey(e)) {
        e.preventDefault();
        if (e.shiftKey) handleGoHome();
        else handleGoToTodosKeepSearch();
        return;
      }

      if (e.key === 'Escape' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleClearSearch();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    isMobileLayout,
    handleGoHome,
    handleGoToTodosKeepSearch,
    handleClearSearch,
    activeVideo,
    showAdminPanel,
    shortcutsOpen,
    comparePick,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activeVideo || showAdminPanel || shortcutsOpen || comparePick) return;
      if (!isEmptySearchState) return;
      e.preventDefault();
      e.stopPropagation();
      handleSearchEscapeBack();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [
    isEmptySearchState,
    activeVideo,
    showAdminPanel,
    shortcutsOpen,
    comparePick,
    handleSearchEscapeBack,
  ]);

  useEffect(() => {
    if (loading || exercises.length === 0) return;
    console.log('[DMX:Filter] Total:', exercises.length, '→ visíveis:', filteredExercises.length, {
      isAdmin,
      adminFilter,
      activeCategory,
      searchTerm: searchTerm.trim() || '(vazio)',
    });
    if (!isAdmin && filteredExercises.length === 0 && exercises.length > 0) {
      logWarn(
        'Filter',
        'Exercícios carregados mas nenhum visível para aluno — verifique youtubeUrl nos documentos'
      );
    }
  }, [loading, exercises.length, filteredExercises.length, isAdmin, adminFilter, activeCategory, searchTerm]);

  const saveHeroSpotlight = async (next: HeroSpotlightSettings) => {
    const normalized = normalizeHeroSpotlight(next);
    setHeroSpotlight(normalized);
    setAppSettings((prev) => ({ ...prev, heroSpotlight: normalized }));
    try {
      const settingsRef = fbDoc(db, ...getSettingsPath());
      await setDoc(settingsRef, { heroSpotlight: normalized }, { merge: true });
      showToast('Destaque salvo!');
    } catch {
      showToast('Erro ao salvar destaque', 'error');
    }
  };

  const handleCampaignClick = (linkUrl: string, campaignId?: string) => {
    if (campaignId) void trackHeroCampaignClick(campaignId);
    window.open(linkUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCampaignImpression = useCallback((campaignId: string) => {
    void trackHeroCampaignImpression(campaignId);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    let targetId = String(form.id).trim();
    if (!targetId && !editingId) {
      const existingIds = exercises.map((ex) => parseInt(ex.id, 10)).filter((id) => !isNaN(id));
      existingIds.sort((a, b) => a - b);
      let nextAvailableId = 1;
      for (let i = 0; i < existingIds.length; i++) {
        if (existingIds[i] === nextAvailableId) nextAvailableId++;
        else if (existingIds[i] > nextAvailableId) break;
      }
      targetId = String(nextAvailableId).padStart(4, '0');
    }
    const isDuplicateId = exercises.some(
      (ex) => String(ex.id) === targetId && ex.firestoreId !== editingId
    );
    if (isDuplicateId) {
      showToast(`Erro: O ID "${targetId}" já está em uso!`, 'error');
      return;
    }
    const targetName = String(form.name).trim().toLowerCase();
    const isDuplicateName = exercises.some(
      (ex) => String(ex.name).trim().toLowerCase() === targetName && ex.firestoreId !== editingId
    );
    if (isDuplicateName) {
      showToast(`Erro: Já existe um exercício com o nome exato "${form.name.trim()}"!`, 'error');
      return;
    }
    try {
      const existingEx = editingId ? exercises.find((ex) => ex.firestoreId === editingId) : null;
      const data = buildExerciseWritePayload(form, targetId, existingEx);
      const path = exercisesPath;
      let shouldNotify = false;
      const isCompleteNow = !isExerciseIncomplete(String(data.youtubeUrl));
      if (editingId) {
        const wasIncomplete = existingEx ? isExerciseIncomplete(existingEx.youtubeUrl) : true;
        if (wasIncomplete && isCompleteNow) shouldNotify = true;
      } else if (isCompleteNow) {
        shouldNotify = true;
      }
      if (editingId) {
        const docRef = fbDoc(db, ...path, editingId);
        setExercises((prev) => applyExerciseSaveToList(prev, editingId, data, form));
        await updateDoc(docRef, data);
        showToast('Alterações salvas com sucesso!');
      } else {
        const collRef = fbCollection(db, ...path);
        await addDoc(collRef, data);
        showToast('Salvo! Pronto para adicionar o próximo.');
      }
      if (shouldNotify) {
        try {
          if (sendNotification) {
            let notifThumb = String(data.thumbnail || '');
            if (!notifThumb && data.youtubeUrl) {
              const ytId = getYouTubeId(String(data.youtubeUrl));
              if (ytId) notifThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }
            await addDoc(fbCollection(db, ...getNotifPath()), {
              title: 'NOVO EXERCÍCIO LIBERADO',
              message: `"${data.name}" já está disponível na biblioteca.`,
              thumbnail: notifThumb || '',
              type: 'new_exercise',
              exerciseId: targetId,
              createdAt: new Date().toISOString(),
            });
          }
          if (sendEmail && appSettings.webhookUrl) {
            fetch(appSettings.webhookUrl, {
              method: 'POST',
              body: JSON.stringify({
                event: 'new_exercise_added',
                exercise_name: data.name,
                exercise_id: data.id,
                category: data.category,
                url: data.youtubeUrl,
              }),
            }).catch(() => console.error('Webhook falhou'));
          }
        } catch (notifErr) {
          logWarn('Save', 'Exercício salvo, mas notificação falhou:', notifErr);
        }
      }
      closeAdminPanel();
    } catch (err) {
      logError('Save', err);
      showToast('Erro ao gravar. O servidor negou permissão.', 'error');
    }
  };

  const handleBatchImport = async () => {
    if (!batchInput.trim()) return;
    setSyncing(true);
    try {
      const dataArray = JSON.parse(batchInput);
      if (!Array.isArray(dataArray)) throw new Error('JSON deve ser um Array');
      const existingNames = exercises.map((ex) => String(ex.name).trim().toLowerCase());
      const existingIdsStr = exercises.map((ex) => String(ex.id));
      const existingIdsNum = exercises.map((ex) => parseInt(ex.id, 10)).filter((id) => !isNaN(id));
      const newDataArray: Record<string, unknown>[] = [];
      let skippedCount = 0;
      const namesInCurrentBatch = new Set<string>();
      for (const item of dataArray) {
        const itemName = String(item.name || '').trim().toLowerCase();
        if (!itemName) continue;
        if (existingNames.includes(itemName) || namesInCurrentBatch.has(itemName)) {
          skippedCount++;
          continue;
        }
        namesInCurrentBatch.add(itemName);
        newDataArray.push(item);
      }
      if (newDataArray.length === 0) {
        showToast(`Aviso: Todos os ${skippedCount} exercícios da lista já existem na base!`, 'error');
        setSyncing(false);
        return;
      }
      let nextAvailableId = 1;
      const idsNum = [...existingIdsNum];
      const idsStr = [...existingIdsStr];
      const finalDataArray = newDataArray.map((item) => {
        let targetId = String(item.id || '').trim();
        if (!targetId || idsStr.includes(targetId)) {
          while (idsNum.includes(nextAvailableId)) nextAvailableId++;
          targetId = String(nextAvailableId).padStart(4, '0');
          idsNum.push(nextAvailableId);
        } else {
          idsNum.push(parseInt(targetId, 10));
          idsStr.push(targetId);
        }
        return { ...item, id: targetId, hasCloudVideo: null as boolean | null };
      });
      const batch = writeBatch(db);
      const collRef = fbCollection(db, ...getDbPath());
      finalDataArray.forEach((item: Record<string, unknown>) => {
        const docRef = fbDoc(collRef);
        const manualFocus = parseCoverFocusYInput(
          item.coverFocusY != null ? String(item.coverFocusY) : ''
        );
        const payload: Record<string, unknown> = {
          ...item,
          muscleGroups: normalizeMuscleGroups(parseCommaList(String(item.muscleGroups || ''))),
          keywords: parseCommaList(String(item.keywords || '')),
          equipment: normalizeEquipment(item.equipment as string[] | string | undefined),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (manualFocus !== undefined) {
          payload.coverFocusY = manualFocus;
        } else {
          delete payload.coverFocusY;
        }
        batch.set(docRef, payload);
      });
      await batch.commit();
      closeAdminPanel();
      setBatchInput('');
      showToast(
        `Lote: ${finalDataArray.length} salvos! ${skippedCount > 0 ? `(${skippedCount} ignorados já existiam)` : ''}`
      );
    } catch (e) {
      console.error('Batch error:', e);
      showToast('Erro de formato no JSON ou permissão negada.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const copyLink = (url: string, firestoreId: string) => {
    try {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(firestoreId);
        showToast('Link copiado!');
        setTimeout(() => setCopiedId(null), 2000);
      });
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(firestoreId);
      showToast('Link copiado!');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const copyExerciseName = (name: string, firestoreId: string) => {
    const write = () => {
      setCopiedNameId(firestoreId);
      showToast('Nome copiado!');
      setTimeout(() => setCopiedNameId(null), 2000);
    };

    try {
      navigator.clipboard.writeText(name).then(write);
    } catch {
      const el = document.createElement('textarea');
      el.value = name;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      write();
    }
  };

  const closeLightbox = useCallback(() => {
    setActiveVideo(null);
    setSpotlightExerciseId(null);
    setCompareEx(null);
    reelsResetPlaybackMemory();
    disposeYouTubeWarmup();
  }, []);

  const watchExercise = useCallback(
    (ex: Exercise, options?: { fromSpotlight?: boolean }) => {
      signalMobilePlaybackGesture();
      primeVideoPlaybackIntent(ex, { force: true });
      setSpotlightExerciseId(options?.fromSpotlight ? ex.firestoreId : null);
      setCompareEx(null);
      setActiveVideo(ex);
      if (saveRecentVideos) addRecent(ex);
    },
    [addRecent, saveRecentVideos]
  );

  const handleCompare = useCallback(
    (ex: Exercise) => {
      if (!isFeatureEnabled('compare')) {
        showToast('Comparador disponível no computador.', 'error');
        return;
      }
      if (isMobileUi()) {
        showToast('Comparador lado a lado disponível no computador. Abrindo vídeo.', 'success');
        watchExercise(ex);
        return;
      }
      if (!comparePick) {
        setComparePick(ex);
        showToast('Selecione o segundo exercício para comparar');
        return;
      }
      if (comparePick.firestoreId === ex.firestoreId) {
        setComparePick(null);
        showToast('Comparação cancelada');
        return;
      }
      if (saveRecentVideos) {
        addRecent(comparePick);
        addRecent(ex);
      }
      setActiveVideo(comparePick);
      setCompareEx(ex);
      setComparePick(null);
    },
    [comparePick, addRecent, showToast, watchExercise, saveRecentVideos]
  );

  useEffect(() => {
    if (!comparePick || activeVideo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setComparePick(null);
      showToast('Comparação cancelada');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [comparePick, activeVideo, showToast]);

  const togglePlaylistItem = useCallback((ex: Exercise) => {
    setPlaylistOrder((prev) => {
      const idx = prev.indexOf(ex.firestoreId);
      if (idx >= 0) return prev.filter((id) => id !== ex.firestoreId);
      return [...prev, ex.firestoreId];
    });
  }, []);

  const toggleFavoriteExercise = useCallback(
    (ex: Exercise) => toggleFavorite(ex.firestoreId),
    [toggleFavorite]
  );

  const playPlaylist = useCallback(() => {
    if (playlist.length === 0) return;
    watchExercise(playlist[0]);
    setSelectionMode(false);
  }, [playlist, watchExercise]);

  const activePlaylistIndex = useMemo(() => {
    if (!activeVideo || playlist.length === 0) return 0;
    const idx = playlist.findIndex((p) => p.firestoreId === activeVideo.firestoreId);
    return idx >= 0 ? idx : 0;
  }, [activeVideo, playlist]);

  const isPlaylistActive =
    !!activeVideo && playlist.some((p) => p.firestoreId === activeVideo.firestoreId);

  const handlePlaylistNext = useCallback(() => {
    if (!isPlaylistActive || activePlaylistIndex >= playlist.length - 1) return;
    watchExercise(playlist[activePlaylistIndex + 1]);
  }, [isPlaylistActive, activePlaylistIndex, playlist, watchExercise]);

  const handlePlaylistPrev = useCallback(() => {
    if (!isPlaylistActive || activePlaylistIndex <= 0) return;
    watchExercise(playlist[activePlaylistIndex - 1]);
  }, [isPlaylistActive, activePlaylistIndex, playlist, watchExercise]);

  const handleVideoEnded = useCallback(() => {
    if (!isPlaylistActive) return;
    if (activePlaylistIndex < playlist.length - 1) {
      watchExercise(playlist[activePlaylistIndex + 1]);
    }
  }, [isPlaylistActive, activePlaylistIndex, playlist, watchExercise]);

  /** Lista visível para navegação ← → no lightbox (busca, categoria ou treino) */
  const baseLightboxNavList = useMemo(() => {
    if (isPlaylistActive && playlist.length > 1) return playlist;
    return filteredExercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl));
  }, [isPlaylistActive, playlist, filteredExercises]);

  // Congela a lista de navegação enquanto o player está aberto. Sem isso,
  // (des)favoritar o vídeo atual o remove de `filteredExercises`, encolhe a lista
  // e o índice cai para 0 — fazendo o feed "pular" para um vídeo anterior.
  const [frozenLightboxNavList, setFrozenLightboxNavList] = useState<Exercise[]>([]);
  const lightboxWasOpenRef = useRef(false);
  useEffect(() => {
    const isOpen = !!activeVideo;
    if (isOpen && !lightboxWasOpenRef.current) {
      setFrozenLightboxNavList(baseLightboxNavList);
    } else if (!isOpen && lightboxWasOpenRef.current) {
      setFrozenLightboxNavList([]);
    }
    lightboxWasOpenRef.current = isOpen;
  }, [activeVideo, baseLightboxNavList]);

  const lightboxNavList =
    activeVideo && frozenLightboxNavList.length > 0 ? frozenLightboxNavList : baseLightboxNavList;

  const lightboxNavIndex = useMemo(() => {
    if (!activeVideo || lightboxNavList.length === 0) return 0;
    const idx = lightboxNavList.findIndex((ex) => ex.firestoreId === activeVideo.firestoreId);
    return idx >= 0 ? idx : 0;
  }, [activeVideo, lightboxNavList]);

  const handleLightboxNavNext = useCallback(() => {
    if (lightboxNavIndex >= lightboxNavList.length - 1) return;
    watchExercise(lightboxNavList[lightboxNavIndex + 1]);
  }, [lightboxNavIndex, lightboxNavList, watchExercise]);

  const handleLightboxNavPrev = useCallback(() => {
    if (lightboxNavIndex <= 0) return;
    watchExercise(lightboxNavList[lightboxNavIndex - 1]);
  }, [lightboxNavIndex, lightboxNavList, watchExercise]);

  const handleSelectRecentExercise = useCallback(
    (firestoreId: string, _name: string) => {
      const ex = exercises.find((e) => e.firestoreId === firestoreId);
      if (!ex) return;
      if (!showAdminUI && !hasValidYouTubeUrl(ex.youtubeUrl)) return;

      setSearchTerm('');

      if (activeCategory !== 'Todos') {
        if (activeCategory === 'Favoritos') {
          if (!favorites.has(firestoreId)) {
            setActiveCategory(resolveExerciseNavCategory(ex.category));
          }
        } else if (ex.category !== activeCategory) {
          setActiveCategory(resolveExerciseNavCategory(ex.category));
        }
      }

      watchExercise(ex);
    },
    [exercises, showAdminUI, activeCategory, favorites, watchExercise]
  );

  const pageKey = searchTerm.trim()
    ? `search-${searchTerm.trim().slice(0, 40)}`
    : `browse-${activeCategory}`;

  useEffect(() => {
    if (loading || !isLoggedIn || isMobileUi()) return;

    const run = () => primeYouTubePlayerApi();
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(run, 800);
    return () => window.clearTimeout(timer);
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (loading || publicExercises.length === 0) return;

    const viewportLimit = isMobileUi() ? 12 : 28;
    const viewportItems = gridExercises.slice(0, viewportLimit).map((ex) => ({
      firestoreId: ex.firestoreId,
      id: ex.id,
    }));

    const priorityOrder = gridExercises.map((ex) => ex.firestoreId);
    const visibleIds = new Set(viewportItems.map((item) => item.firestoreId));
    const heroId = heroDisplay?.exercise?.firestoreId ?? null;
    if (heroId) visibleIds.add(heroId);

    const membershipChanged = gridMembershipRef.current !== gridMembershipKey;
    gridMembershipRef.current = gridMembershipKey;

    const scheduleWarmup = () => {
      if (isMobileUi()) return;
      scheduleKnownCoversWarmup({
        excludeIds: visibleIds,
        priorityOrder,
      });
    };

    if (showAdminUI) {
      prefetchExerciseCovers(viewportItems, 'critical');
      if (!isMobileUi()) {
        scheduleKnownCoversWarmup({
          excludeIds: new Set(viewportItems.map((item) => item.firestoreId)),
          priorityOrder,
        });
      }
      return;
    }

    if (!membershipChanged) {
      prefetchExerciseCovers(viewportItems, 'critical');
      scheduleWarmup();
      return;
    }

    const heroExercise = heroDisplay?.exercise;

    if (heroExercise) {
      void resolveExerciseCoverUrl(
        { firestoreId: heroExercise.firestoreId, id: heroExercise.id },
        'critical'
      );
    }

    const coverSources = gridExercises.map((ex) => ({
      firestoreId: ex.firestoreId,
      id: ex.id,
    }));

    if (isMobileUi()) {
      prefetchExerciseCovers(viewportItems, 'critical');
      primeCoversFromExerciseList(coverSources.slice(0, 28), { heroFirestoreId: heroId });
      return;
    }

    primeCoversFromExerciseList(coverSources, { heroFirestoreId: heroId });
    prefetchExerciseCovers(viewportItems, 'critical');
    scheduleWarmup();
  }, [
    loading,
    publicExercises.length,
    gridExercises,
    gridMembershipKey,
    gridOrderKey,
    heroDisplay?.exercise?.firestoreId,
    showAdminUI,
  ]);

  if (authLoading || googleRedirectPending || (isLoggedIn && !isAdmin && profileLoading)) {
    return <LoadingScreen slowConnection={slowConnection} />;
  }

  if (authActionParams) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast({ show: false, msg: '', type: 'success' })} />
        <Suspense fallback={<LoadingScreen />}>
          <AuthActionScreen
            params={authActionParams}
            onDone={() => {
              clearAuthActionParams();
              setAuthActionParams(null);
              setAuthMode('login');
            }}
          />
        </Suspense>
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast({ show: false, msg: '', type: 'success' })} />
        <LoginScreen
          authMode={authMode}
          setAuthMode={setAuthMode}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          registerPasswordConfirm={registerPasswordConfirm}
          setRegisterPasswordConfirm={setRegisterPasswordConfirm}
          registerName={registerName}
          setRegisterName={setRegisterName}
          registerNickname={registerNickname}
          setRegisterNickname={setRegisterNickname}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          submitting={authSubmitting}
          onSubmit={handleAuthSubmit}
          onGoogleSignIn={handleGoogleSignIn}
          googleSubmitting={googleSubmitting}
          googleLinkPending={googleLinkPending}
          onCancelGoogleLink={cancelGoogleLinkFlow}
          onResendPasswordReset={handleResendPasswordReset}
          passwordResetResending={passwordResetResending}
        />
      </>
    );
  }

  if (!isAdmin && userProfile?.status === 'pending') {
    return <PendingAccessScreen onLogout={handleLogout} onCheckoutError={(msg) => showToast(msg, 'error')} />;
  }

  if (!isAdmin && userProfile?.status === 'blocked') {
    return <BlockedAccessScreen onLogout={handleLogout} />;
  }

  if (!isAdmin && !userProfile) {
    return <LoadingScreen slowConnection={slowConnection} />;
  }

  return (
    <div className="page-canvas min-h-screen flex flex-col relative font-sans text-[var(--dmx-fg)]">
      {!isMobileLayout && (
        <ShortcutsPanel
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
          hasLightboxNav={lightboxNavList.length > 1}
          hasCompare={isFeatureEnabled('compare')}
          isAdmin={showAdminUI}
        />
      )}
      <AnimatePresence>
        {activeVideo && (
          <Suspense fallback={null}>
            <CinemaLightbox
            key={compareEx ? 'compare' : 'cinema'}
            ex={activeVideo}
            compareEx={compareEx}
            onClose={closeLightbox}
            copyLink={copyLink}
            copyExerciseName={copyExerciseName}
            copiedId={copiedId}
            copiedNameId={copiedNameId}
            onDownload={downloadExercise}
            playlist={isPlaylistActive ? playlist : []}
            playlistIndex={activePlaylistIndex}
            onPlaylistNext={handlePlaylistNext}
            onPlaylistPrev={handlePlaylistPrev}
            navList={lightboxNavList}
            navIndex={lightboxNavIndex}
            onNavNext={handleLightboxNavNext}
            onNavPrev={handleLightboxNavPrev}
            onVideoEnded={handleVideoEnded}
            isFavorite={isFavorite(activeVideo.firestoreId)}
            onToggleFavorite={() => toggleFavorite(activeVideo.firestoreId)}
            isAdmin={showAdminUI}
            videoLoop={videoLoop}
            compareLoopSync={compareLoopSync}
            videoAutoplay={videoAutoplay}
            spotlightExerciseId={spotlightExerciseId}
          />
          </Suspense>
        )}
      </AnimatePresence>
      <Toast toast={toast} onClose={() => setToast({ show: false, msg: '', type: 'success' })} />
      {showRequestModal && (
        <Suspense fallback={null}>
          <RequestModal
            requestForm={requestForm}
            setRequestForm={setRequestForm}
            onSubmit={handleRequestSubmit}
            onClose={() => setShowRequestModal(false)}
          />
        </Suspense>
      )}

      <SiteHeader
        user={user}
        userProfile={userProfile}
        onUpdateNickname={handleUpdateNickname}
        onResendVerification={handleResendVerification}
        videoLoop={videoLoop}
        onToggleVideoLoop={(enabled) => void handleUpdateVideoLoop(enabled)}
        videoAutoplay={videoAutoplay}
        onToggleVideoAutoplay={(enabled) => void handleUpdateVideoAutoplay(enabled)}
        compareLoopSync={compareLoopSync}
        onToggleCompareLoopSync={(enabled) => void handleUpdateCompareLoopSync(enabled)}
        exerciseSortOrder={exerciseSortOrder}
        onExerciseSortOrderChange={handleExerciseSortOrderChange}
        saveRecentVideos={saveRecentVideos}
        onToggleSaveRecentVideos={setSaveRecentVideos}
        saveSearchHistory={saveSearchHistory}
        onToggleSaveSearchHistory={setSaveSearchHistory}
        liveSearchSuggestions={liveSearchSuggestions}
        onToggleLiveSearchSuggestions={setLiveSearchSuggestions}
        cardHoverPreview={cardHoverPreview}
        onToggleCardHoverPreview={setCardHoverPreview}
        cardCoverParallax={cardCoverParallax}
        onToggleCardCoverParallax={setCardCoverParallax}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchCommit={handleSearchCommit}
        searchHistory={visibleSearchHistory}
        searchRecents={visibleRecents}
        onSelectHistory={handleSelectSearchHistory}
        onSelectRecent={handleSelectRecentExercise}
        onRemoveHistoryItem={removeHistoryItem}
        onClearHistory={clearHistory}
        searchSuggestions={searchSuggestions}
        onSelectSuggestion={(ex) => {
          if (!showAdminUI && !hasValidYouTubeUrl(ex.youtubeUrl)) return;
          if (saveSearchHistory) addSearch(ex.name);
          watchExercise(ex);
        }}
        onSuggest={() => setShowRequestModal(true)}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        showNotifications={showNotifications}
        onToggleNotifications={toggleNotifications}
        onCloseNotifications={closeNotifications}
        onClearNotifications={clearAllNotifications}
        visibleNotifications={visibleNotifications}
        lastReadAt={lastReadAt}
        onNotificationClick={handleNotificationClick}
        onOpenShortcuts={isMobileLayout ? undefined : () => setShortcutsOpen(true)}
        onGoHome={handleGoHome}
        enableStudentGuide={!showAdminUI}
        mobileShellMode={useMobileShell}
        mobileCompactHeader={useMobileAdminShell}
        mobileAccountScreenActive={useMobileShell && mobileTab === 'account'}
        mobileSearchWithCategory={useMobileShell && !!searchTerm.trim() && mobileTab !== 'account'}
        mobileSearchCategories={MOBILE_CATEGORY_NAV}
        mobileSearchActiveCategory={activeCategory}
        onMobileSearchCategoryChange={handleSearchScreenCategoryChange}
      />

      {showAdminUI && !useMobileAdminShell && (
        <>
          {adminFilter === 'missing_cover' && coverProbeLoading && (
            <div className="cover-audit-banner cinema-container mb-fluid-sm">
              <Icon name="loader" className="w-4 h-4 animate-spin shrink-0" />
              <span>
                Verificando capas no GitHub… {coverProbeProgress.done}/{coverProbeProgress.total}
              </span>
            </div>
          )}
          <AdminStudioBar
          stats={stats}
          adminFilter={adminFilter}
          onFilterChange={setAdminFilter}
          pendingUsersCount={pendingUsersCount}
          pendingRequestsCount={pendingRequestsCount}
          onOpenTab={openAdminTab}
          onNewExercise={() => openAdminTab('batch')}
          adminUserPreview={adminUserPreview}
          onToggleUserPreview={() => setAdminUserPreview((v) => !v)}
        />
        </>
      )}

      {adminUserPreview && (
        <div className="user-preview-banner cinema-container">
          <div className="user-preview-banner-inner">
            <Icon name="eye" className="w-4 h-4 user-preview-icon" />
            <p className="user-preview-text">
              <strong>Visão de usuário</strong> — você está vendo o site como um aluno
            </p>
            <button
              type="button"
              onClick={() => setAdminUserPreview(false)}
              className="user-preview-exit-btn"
            >
              Voltar ao admin
            </button>
          </div>
        </div>
      )}

      {!useMobileShell && !useMobileAdminShell && (
      <CategoryNav
        categories={NAV_CATEGORIES}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        favoritesCount={favorites.size}
      />
      )}

      {(useMobileShell || useMobileAdminShell) && (
        <MobileFilterSheet
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          onReset={resetAdvancedFilters}
          resultCount={filteredExercises.length}
          activeCategory={activeCategory}
          favoriteCount={favorites.size}
        />
      )}

      {(useMobileShell || useMobileAdminShell) && (
        <>
          <StudentSettingsPanel
            open={mobileSettingsOpen}
            onClose={() => setMobileSettingsOpen(false)}
            exerciseSortOrder={exerciseSortOrder}
            onExerciseSortOrderChange={handleExerciseSortOrderChange}
            saveRecentVideos={saveRecentVideos}
            onToggleSaveRecentVideos={setSaveRecentVideos}
            saveSearchHistory={saveSearchHistory}
            onToggleSaveSearchHistory={setSaveSearchHistory}
            liveSearchSuggestions={liveSearchSuggestions}
            onToggleLiveSearchSuggestions={setLiveSearchSuggestions}
            cardHoverPreview={cardHoverPreview}
            onToggleCardHoverPreview={setCardHoverPreview}
            cardCoverParallax={cardCoverParallax}
            onToggleCardCoverParallax={setCardCoverParallax}
            videoLoop={videoLoop}
            onToggleVideoLoop={(enabled) => void handleUpdateVideoLoop(enabled)}
            videoAutoplay={videoAutoplay}
            onToggleVideoAutoplay={(enabled) => void handleUpdateVideoAutoplay(enabled)}
            compareLoopSync={compareLoopSync}
            onToggleCompareLoopSync={(enabled) => void handleUpdateCompareLoopSync(enabled)}
            nickname={userProfile?.nickname ?? ''}
            displayNickname={resolveDisplayNickname({
              nickname: userProfile?.nickname,
              name: userProfile?.name,
              email: user?.email,
            })}
            onUpdateNickname={handleUpdateNickname}
          />
          {useMobileShell && !showAdminUI && (
            <UsageGuidePanel
              open={mobileGuideOpen}
              onClose={() => setMobileGuideOpen(false)}
              variant="mobile"
            />
          )}
        </>
      )}

      {!isMobileLayout && (
        <AdvancedFiltersBar
          filters={advancedFilters}
          onChange={setAdvancedFilters}
          onReset={resetAdvancedFilters}
          resultCount={filteredExercises.length}
          activeCategory={activeCategory}
          favoriteCount={favorites.size}
        />
      )}

      {comparePick && isFeatureEnabled('compareBanner') && (
        <div className="compare-pick-banner cinema-container">
          <Icon name="compare" className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-zinc-300 truncate flex-1">
            Comparando: <span className="text-white font-medium">{comparePick.name}</span> — escolha o
            segundo exercício
          </p>
          <button
            type="button"
            onClick={() => setComparePick(null)}
            className="text-xs text-zinc-500 hover:text-white shrink-0"
          >
            Cancelar <span className="text-zinc-600">(Esc)</span>
          </button>
        </div>
      )}

      <main className={`cinema-container w-full flex-1 relative z-10 ${useMobileShell || useMobileAdminShell ? 'mobile-shell-main' : 'pb-fluid-xl'}`}>
        {showAdminMobileDisabled ? (
          <MobileAdminDisabledNotice />
        ) : useMobileAdminShell ? (
          <>
            <MobileAdminMoreSheet
              open={adminMoreOpen}
              onClose={() => setAdminMoreOpen(false)}
              onOpenTab={openAdminTab}
              onNewExercise={() => openAdminTab('single')}
              onToggleUserPreview={() => setAdminUserPreview((v) => !v)}
              adminUserPreview={adminUserPreview}
              onLogout={handleLogout}
            />
            <MobileAdminShell
              activeTab={adminMobileTab}
              onTabChange={handleAdminMobileTabChange}
              pendingUsersCount={pendingUsersCount}
              pendingRequestsCount={pendingRequestsCount}
            >
              {adminMobileTab === 'catalog' && (
                <div key={pageKey}>
                  <MobileAdminHub
                    stats={stats}
                    adminFilter={adminFilter}
                    onFilterChange={setAdminFilter}
                    onNewExercise={() => openAdminTab('single')}
                    onToggleUserPreview={() => setAdminUserPreview((v) => !v)}
                    adminUserPreview={adminUserPreview}
                    bannerDismissed={adminBannerDismissed}
                    onDismissBanner={dismissAdminBanner}
                    toolbar={
                      <MobileCatalogToolbar
                        filterActiveCount={mobileFilterActiveCount}
                        onOpenFilters={() => setMobileFilterOpen(true)}
                        catalogView={catalogView}
                        onCatalogViewChange={setCatalogView}
                      />
                    }
                  >
                    {loading ? (
                      <div className="py-fluid-2xl">
                        <GridSkeleton count={6} />
                      </div>
                    ) : filteredExercises.length === 0 ? (
                      <EmptyState
                        variant={emptyStateVariant}
                        searchTerm={searchTerm}
                        category={activeCategory}
                        onClearFilters={handleEmptyClearFilters}
                      />
                    ) : (
                      <MobileCatalog
                        exercises={gridExercises}
                        catalogView={catalogView}
                        isAdmin={showAdminUI}
                        isExerciseIncomplete={isExerciseIncomplete}
                        handleDownloadCheck={handleDownloadCheck}
                        setForm={setForm}
                        setEditingId={setEditingId}
                        setAdminTab={setAdminTab}
                        setShowAdminPanel={setShowAdminPanel}
                        copyLink={copyLink}
                        copiedId={copiedId}
                        onWatch={watchExercise}
                        selectionMode={false}
                        playlistSelection={playlistSelectionEmpty}
                        onTogglePlaylist={togglePlaylistItem}
                        isFavorite={isFavorite}
                        onToggleFavoriteExercise={toggleFavoriteExercise}
                        cardHoverPreview={false}
                        cardCoverParallax={false}
                      />
                    )}
                  </MobileAdminHub>
                </div>
              )}
            </MobileAdminShell>
          </>
        ) : useMobileShell ? (
          <MobileShell
            activeTab={mobileTab}
            onTabChange={handleMobileTabChange}
            onBrandPress={handleMobileBrandPress}
            favoritesCount={favorites.size}
            workoutCount={playlistSelection.count}
            selectionMode={selectionMode}
            playbackElevated={!!activeVideo}
          >
            {mobileTab === 'account' ? (
              <MobileAccountScreen
                user={user}
                userProfile={userProfile}
                onUpdateNickname={handleUpdateNickname}
                onResendVerification={handleResendVerification}
                onOpenSettings={() => setMobileSettingsOpen(true)}
                onOpenUsageGuide={() => setMobileGuideOpen(true)}
                onSuggest={() => setShowRequestModal(true)}
                onLogout={handleLogout}
              />
            ) : mobileTab === 'workout' ? (
              <MobileWorkoutScreen
                playlist={playlist}
                onPlay={playPlaylist}
                onClear={() => setPlaylistOrder([])}
                onAddExercises={handleMobileAddToWorkout}
                onWatch={watchExercise}
                onRemoveFromPlaylist={togglePlaylistItem}
              />
            ) : (
              <>
                {mobileTab === 'home' && !searchTerm.trim() && (
                  <CategoryNav
                    categories={MOBILE_CATEGORY_NAV}
                    activeCategory={activeCategory}
                    onCategoryChange={handleCategoryChange}
                    favoritesCount={favorites.size}
                    compact
                  />
                )}
                <div key={pageKey}>
                {mobileTab === 'favorites' && (
                  <header className="mobile-tab-heading cinema-container mb-fluid-md">
                    <h2 className="mobile-tab-heading__title">Favoritos</h2>
                    <p className="mobile-tab-heading__meta">
                      {favorites.size} {favorites.size === 1 ? 'exercício salvo' : 'exercícios salvos'}
                    </p>
                  </header>
                )}
                {(mobileTab === 'home' || mobileTab === 'favorites' || searchTerm.trim()) && (
                  <MobileCatalogToolbar
                    filterActiveCount={mobileFilterActiveCount}
                    onOpenFilters={() => setMobileFilterOpen(true)}
                    catalogView={catalogView}
                    onCatalogViewChange={setCatalogView}
                  />
                )}
                {mobileTab === 'home' && !searchTerm && activeCategory === 'Todos' && heroDisplay && (
                  <HeroBanner
                    hero={heroDisplay}
                    onWatch={(ex) => watchExercise(ex, { fromSpotlight: true })}
                    onCampaignClick={handleCampaignClick}
                    onCampaignImpression={handleCampaignImpression}
                    mobileCompact
                  />
                )}
                {searchTerm.trim() && !loading && filteredExercises.length > 0 && (
                  <p className="search-results-summary mb-fluid-md cinema-container">
                    <span className="search-results-count">{filteredExercises.length}</span>
                    {filteredExercises.length === 1 ? ' resultado' : ' resultados'}
                    <span className="search-results-meta"> · ordenados por relevância</span>
                  </p>
                )}
                {loading ? (
                  <div className="py-fluid-2xl">
                    <GridSkeleton count={6} />
                    {slowConnection && (
                      <p className="text-2xs text-red-500 uppercase font-black mt-fluid-md text-center bg-accent-muted px-4 py-2 rounded-xl mx-auto w-fit border border-red-900/30">
                        A conexão parece lenta. Aguarde...
                      </p>
                    )}
                  </div>
                ) : filteredExercises.length === 0 ? (
                  <EmptyState
                    variant={emptyStateVariant}
                    searchTerm={searchTerm}
                    category={activeCategory}
                    onSuggest={
                      searchTerm.trim()
                        ? () => {
                            setRequestForm({ name: searchTerm, details: '' });
                            setShowRequestModal(true);
                          }
                        : undefined
                    }
                    onClearFilters={handleEmptyClearFilters}
                    onSearchAllCategories={
                      emptyStateVariant === 'search' && activeCategory !== 'Todos'
                        ? handleGoToTodosKeepSearch
                        : undefined
                    }
                    onGoHome={emptyStateVariant === 'search' ? handleGoHome : undefined}
                  />
                ) : (
                  <MobileCatalog
                    exercises={gridExercises}
                    catalogView={catalogView}
                    isAdmin={showAdminUI}
                    isExerciseIncomplete={isExerciseIncomplete}
                    handleDownloadCheck={handleDownloadCheck}
                    setForm={setForm}
                    setEditingId={setEditingId}
                    setAdminTab={setAdminTab}
                    setShowAdminPanel={setShowAdminPanel}
                    copyLink={copyLink}
                    copiedId={copiedId}
                    onWatch={watchExercise}
                    selectionMode={selectionMode}
                    playlistSelection={playlistSelection}
                    onTogglePlaylist={togglePlaylistItem}
                    isFavorite={isFavorite}
                    onToggleFavoriteExercise={toggleFavoriteExercise}
                    cardHoverPreview={cardHoverPreview}
                    cardCoverParallax={cardCoverParallax}
                  />
                )}
              </div>
              </>
            )}
          </MobileShell>
        ) : isMobileLayout ? (
          <div key={pageKey}>
        {!searchTerm && activeCategory === 'Todos' && heroDisplay && (
          <HeroBanner
            hero={heroDisplay}
            onWatch={(ex) => watchExercise(ex, { fromSpotlight: true })}
            onCampaignClick={handleCampaignClick}
            onCampaignImpression={handleCampaignImpression}
          />
        )}
        {searchTerm.trim() && !loading && filteredExercises.length > 0 && (
          <p className="search-results-summary mb-fluid-md">
            <span className="search-results-count">{filteredExercises.length}</span>
            {filteredExercises.length === 1 ? ' resultado' : ' resultados'}
            <span className="search-results-meta"> · ordenados por relevância</span>
          </p>
        )}
        {loading ? (
          <div className="py-fluid-2xl">
            <GridSkeleton count={isMobileLayout ? 6 : 12} />
            {slowConnection && (
              <p className="text-2xs text-red-500 uppercase font-black mt-fluid-md text-center bg-accent-muted px-4 py-2 rounded-xl mx-auto w-fit border border-red-900/30">
                A conexão parece lenta. Aguarde...
              </p>
            )}
          </div>
        ) : filteredExercises.length === 0 ? (
          <EmptyState
            variant={emptyStateVariant}
            searchTerm={searchTerm}
            category={activeCategory}
            onSuggest={
              searchTerm.trim()
                ? () => {
                    setRequestForm({ name: searchTerm, details: '' });
                    setShowRequestModal(true);
                  }
                : undefined
            }
            onClearFilters={handleEmptyClearFilters}
            onSearchAllCategories={
              emptyStateVariant === 'search' && activeCategory !== 'Todos'
                ? handleGoToTodosKeepSearch
                : undefined
            }
            onGoHome={emptyStateVariant === 'search' ? handleGoHome : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-fluid-md @container">
            {gridExercises.map((ex, index) => (
              <ExerciseCard
                key={ex.firestoreId}
                ex={ex}
                index={index}
                isAdmin={showAdminUI}
                isExerciseIncomplete={isExerciseIncomplete}
                handleDownloadCheck={handleDownloadCheck}
                setForm={setForm}
                setEditingId={setEditingId}
                setAdminTab={setAdminTab}
                setShowAdminPanel={setShowAdminPanel}
                copyLink={copyLink}
                copiedId={copiedId}
                onWatch={watchExercise}
                selectionMode={selectionMode}
                isInPlaylist={playlistSelection.ids.has(ex.firestoreId)}
                playlistSequence={getPlaylistSequence(playlistSelection, ex.firestoreId, selectionMode)}
                onTogglePlaylist={togglePlaylistItem}
                isFavorite={isFavorite(ex.firestoreId)}
                onToggleFavorite={toggleFavoriteExercise}
                onCompare={isFeatureEnabled('compare') ? handleCompare : undefined}
                isComparePick={comparePick?.firestoreId === ex.firestoreId}
                prefetchPeers={getGridPrefetchPeers(gridExercises, index)}
                hoverPreviewEnabled={cardHoverPreview}
                coverParallaxEnabled={cardCoverParallax}
              />
            ))}
          </div>
        )}
          </div>
        ) : (
          <motion.div
            key={pageKey}
            variants={pageTransition}
            initial="initial"
            animate="animate"
          >
        {!searchTerm && activeCategory === 'Todos' && heroDisplay && (
          <HeroBanner
            hero={heroDisplay}
            onWatch={(ex) => watchExercise(ex, { fromSpotlight: true })}
            onCampaignClick={handleCampaignClick}
            onCampaignImpression={handleCampaignImpression}
          />
        )}
        {searchTerm.trim() && !loading && filteredExercises.length > 0 && (
          <p className="search-results-summary mb-fluid-md">
            <span className="search-results-count">{filteredExercises.length}</span>
            {filteredExercises.length === 1 ? ' resultado' : ' resultados'}
            <span className="search-results-meta"> · ordenados por relevância</span>
          </p>
        )}
        {loading ? (
          <div className="py-fluid-2xl">
            <GridSkeleton count={12} />
            {slowConnection && (
              <p className="text-2xs text-red-500 uppercase font-black mt-fluid-md text-center bg-accent-muted px-4 py-2 rounded-xl mx-auto w-fit border border-red-900/30">
                A conexão parece lenta. Aguarde...
              </p>
            )}
          </div>
        ) : filteredExercises.length === 0 ? (
          <EmptyState
            variant={emptyStateVariant}
            searchTerm={searchTerm}
            category={activeCategory}
            onSuggest={
              searchTerm.trim()
                ? () => {
                    setRequestForm({ name: searchTerm, details: '' });
                    setShowRequestModal(true);
                  }
                : undefined
            }
            onClearFilters={handleEmptyClearFilters}
            onSearchAllCategories={
              emptyStateVariant === 'search' && activeCategory !== 'Todos'
                ? handleGoToTodosKeepSearch
                : undefined
            }
            onGoHome={emptyStateVariant === 'search' ? handleGoHome : undefined}
          />
        ) : (
          <motion.div
            key={catalogSortOrder}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-fluid-md @container"
          >
            {gridExercises.map((ex, index) => (
              <ExerciseCard
                key={ex.firestoreId}
                ex={ex}
                index={index}
                isAdmin={showAdminUI}
                isExerciseIncomplete={isExerciseIncomplete}
                handleDownloadCheck={handleDownloadCheck}
                setForm={setForm}
                setEditingId={setEditingId}
                setAdminTab={setAdminTab}
                setShowAdminPanel={setShowAdminPanel}
                copyLink={copyLink}
                copiedId={copiedId}
                onWatch={watchExercise}
                selectionMode={selectionMode}
                isInPlaylist={playlistSelection.ids.has(ex.firestoreId)}
                playlistSequence={getPlaylistSequence(playlistSelection, ex.firestoreId, selectionMode)}
                onTogglePlaylist={togglePlaylistItem}
                isFavorite={isFavorite(ex.firestoreId)}
                onToggleFavorite={toggleFavoriteExercise}
                onCompare={isFeatureEnabled('compare') ? handleCompare : undefined}
                isComparePick={comparePick?.firestoreId === ex.firestoreId}
                prefetchPeers={getGridPrefetchPeers(gridExercises, index)}
                hoverPreviewEnabled={cardHoverPreview}
                coverParallaxEnabled={cardCoverParallax}
              />
            ))}
          </motion.div>
        )}
          </motion.div>
        )}
      </main>

      {!useMobileShell && (
      <PlaylistBar
        playlist={playlist}
        selectionMode={selectionMode}
        onToggleSelectionMode={() => setSelectionMode((v) => !v)}
        onPlay={playPlaylist}
        onClear={() => setPlaylistOrder([])}
      />
      )}

      {showAdminPanel && showAdminUI && (
        <Suspense fallback={null}>
        <AdminPanel
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          editingId={editingId}
          form={form}
          setForm={setForm}
          onClose={closeAdminPanel}
          mobileLayout={useMobileAdminShell}
          onSave={handleSave}
          sendNotification={sendNotification}
          setSendNotification={setSendNotification}
          sendEmail={sendEmail}
          setSendEmail={setSendEmail}
          batchInput={batchInput}
          setBatchInput={setBatchInput}
          syncing={syncing}
          onBatchImport={handleBatchImport}
          exerciseRequests={exerciseRequests}
          onMarkRequestDone={markRequestAsDoneAndNotify}
          onDeleteRequest={deleteRequest}
          authorizedEmails={authorizedEmails}
          newAuthEmail={newAuthEmail}
          setNewAuthEmail={setNewAuthEmail}
          onAddAuthEmail={handleAddAuthEmail}
          onRemoveAuthEmail={handleRemoveAuthEmail}
          appUsers={appUsers}
          onSetUserStatus={setUserAccessStatus}
          onDeleteUser={deleteUserProfileAdmin}
          onRemoveDuplicates={removeDuplicateUserProfiles}
          isAuditing={isAuditing}
          auditProgress={auditProgress}
          auditCurrentItem={auditCurrentItem}
          auditStats={auditStats}
          onRunCloudAudit={runCloudAudit}
          appSettings={appSettings}
          setAppSettings={setAppSettings}
          onSaveSettings={saveSettings}
          exercises={exercises}
          heroSpotlight={appSettings.heroSpotlight ?? heroSpotlight}
          onHeroSpotlightChange={(next) =>
            setAppSettings((prev) => ({ ...prev, heroSpotlight: next }))
          }
          onSaveHeroSpotlight={saveHeroSpotlight}
        />
        </Suspense>
      )}
    </div>
  );
}
