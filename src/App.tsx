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
  ToastState,
  AuthMode,
  AdminTab,
  AdminFilter,
} from './types';
import { ADMIN_EMAILS, CUSTOM_LOGO_URL, CATEGORIES, DEFAULT_FORM } from './lib/constants';
import {
  getDbPath,
  getAlternateExercisesPath,
  getYouTubeId,
  parseCommaList,
  isExerciseIncomplete,
  hasValidYouTubeUrl,
  getNotifPath,
  getRequestsPath,
  getUsersPath,
  getAuthorizedPath,
  getSettingsPath,
  getUserProfilePath,
  getUserNotifSettingsPath,
  buildExerciseImageFallbacks,
  logDebug,
  logError,
  logWarn,
} from './lib/utils';
import { normalizeMuscleGroups } from './lib/muscleGroups';
import { getAuthErrorCode, getAuthErrorMessage } from './lib/authErrors';
import {
  buildExerciseSearchIndex,
  rankExercises,
  pickDailyFeaturedExercise,
  filterExercisesByCategory,
} from './lib/search';
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
  writeBatch,
  onSnapshot,
} from './lib/firebase';
import type { User } from './lib/firebase';
import { Icon } from './components/Icon';
import { Toast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginScreen } from './components/LoginScreen';
import { PendingAccessScreen } from './components/PendingAccessScreen';
import { preloadYouTubePlayerApi } from './components/YouTubePlayer';
import { HeroBanner } from './components/HeroBanner';
import { ExerciseCard } from './components/ExerciseCard';
import { RequestModal } from './components/RequestModal';
import { GridSkeleton } from './components/Skeleton';
import { staggerContainer, pageTransition } from './lib/motion';
import { SiteHeader } from './components/SiteHeader';
import { AdminStudioBar } from './components/AdminStudioBar';
import { CategoryNav } from './components/CategoryNav';
import { PlaylistBar } from './components/PlaylistBar';
import { useSearchHistory } from './hooks/useSearchHistory';
import { useFavorites } from './hooks/useFavorites';
import { isCoarsePointer, isMobileUi, useMobileUi } from './hooks/useMediaQuery';
import { isFeatureEnabled } from './lib/mobileCapabilities';
import { prefetchCoverUrls } from './lib/coverCache';
import { normalizeNickname, validateNickname } from './lib/nickname';
import { warmSessionCovers } from './lib/coverImageStore';
import { buildExerciseWritePayload } from './lib/exercisePayload';
import { parseCoverFocusYInput } from './lib/coverFocus';
import {
  isAuthorizedEmailActive,
  resolveInitialUserStatus,
  syncUserAccess,
} from './lib/accessControl';

const CinemaLightbox = lazy(() =>
  import('./components/CinemaLightbox').then((m) => ({ default: m.CinemaLightbox }))
);
const AdminPanel = lazy(() =>
  import('./components/AdminPanel').then((m) => ({ default: m.AdminPanel }))
);

const NAV_CATEGORIES = ['Todos', 'Favoritos', ...CATEGORIES.slice(1)] as const;

export default function App() {
  const isMobileLayout = useMobileUi();
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
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [slowConnection, setSlowConnection] = useState(false);
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('dmx_search') || '');
  const [activeCategory, setActiveCategory] = useState(() => localStorage.getItem('dmx_category') || 'Todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
  const [form, setForm] = useState<ExerciseForm>(DEFAULT_FORM);
  const [exercisesPath, setExercisesPath] = useState<string[]>(() => getDbPath());
  const triedAlternateExercisesPath = useRef(false);

  const pendingUsersCount = appUsers.filter((u) => u.status === 'pending').length;
  const pendingRequestsCount = exerciseRequests.filter((r) => r.status === 'pending').length;

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, msg, type });
    toastTimeoutRef.current = setTimeout(() => setToast({ show: false, msg: '', type: 'success' }), 4000);
  }, []);

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
    localStorage.setItem('dmx_search', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('dmx_category', activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAdminPanel) closeAdminPanel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAdminPanel]);

  useEffect(() => {
    if (!fb.isValid) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = fb.onAuthStateChanged(auth, (u) => {
      if (u) {
        setIsLoggedIn(true);
        setUser(u);
        setIsAdmin(ADMIN_EMAILS.includes(u.email || ''));
      } else {
        setIsLoggedIn(false);
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    const userProfileRef = fbDoc(db, ...getUserProfilePath(user.uid));
    const unsubProfile = onSnapshot(userProfileRef, async (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data() as UserProfile;
        setUserProfile(profile);
        if (!isAdmin && profile.status === 'pending' && user) {
          try {
            const synced = await syncUserAccess(user, profile);
            if (synced.status !== profile.status) {
              setUserProfile(synced);
            }
          } catch (e) {
            console.error('Erro ao sincronizar acesso', e);
          }
        }
      } else if (!isAdmin && user) {
        const email = (user.email || '').trim().toLowerCase();
        const status = await resolveInitialUserStatus(email);
        const newProfile: UserProfile = {
          uid: user.uid,
          email,
          name: user.displayName || 'Aluno DMX',
          status,
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(userProfileRef, newProfile);
          setUserProfile(newProfile);
        } catch (e) {
          console.error('Erro ao migrar usuário', e);
        }
      }
    });
    return () => unsubProfile();
  }, [isLoggedIn, user, isAdmin]);

  const normalizeExerciseDoc = useCallback((docId: string, raw: Record<string, unknown>): Exercise => {
    const muscleGroups = normalizeMuscleGroups(
      parseCommaList(raw.muscleGroups as string | string[] | undefined)
    );
    const keywords = parseCommaList(raw.keywords as string | string[] | undefined);
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
      hasCloudVideo: raw.hasCloudVideo as boolean | null | undefined,
      videoOrientation: raw.videoOrientation ? String(raw.videoOrientation) : undefined,
      aspectRatio: raw.aspectRatio ? String(raw.aspectRatio) : undefined,
      coverFocusY:
        typeof raw.coverFocusY === 'number'
          ? raw.coverFocusY
          : raw.coverFocusY != null && raw.coverFocusY !== ''
            ? Number(raw.coverFocusY)
            : undefined,
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
    logDebug('Firestore', 'Escutando exercícios em:', path.join('/'));
    const collectionRef = fbCollection(db, ...path);
    const unsubExercises = onSnapshot(
      collectionRef,
      (snap) => {
        const data = snap.docs.map((d) => normalizeExerciseDoc(d.id, d.data() as Record<string, unknown>));
        data.sort((a, b) => String(a.id || '').localeCompare(String(b.id || ''), undefined, { numeric: true }));

        console.log('[DMX:Firestore] Exercises loaded:', data.length, 'from', path.join('/'), data.slice(0, 2));
        logDebug('Firestore', `${data.length} exercício(s) em ${path.join('/')}`);

        if (data.length === 0 && tryAlternatePath(path)) return;

        const withYoutube = data.filter((ex) => !isExerciseIncomplete(ex.youtubeUrl)).length;
        console.log('[DMX:Firestore] Com YouTube válido:', withYoutube, '/', data.length);
        logDebug('Firestore', `${withYoutube}/${data.length} com YouTube válido`);

        setExercises(data);
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
    return () => {
      unsubExercises();
      unsubNotif();
      unsubUser();
    };
  }, [isLoggedIn, user, exercisesPath, normalizeExerciseDoc]);

  useEffect(() => {
    if (!isAdmin) return;
    const usersRef = fbCollection(db, ...getUsersPath());
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const users = snap.docs.map((d) => d.data()) as UserProfile[];
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAppUsers(users);
    });

    const settingsRef = fbDoc(db, ...getSettingsPath());
    const unsubSettings = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) setAppSettings(snap.data() as AppSettings);
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
      unsubSettings();
      unsubReqs();
      unsubAuth();
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || exercises.length === 0) return;
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
        await new Promise((r) => setTimeout(r, 4000));
      }
      backgroundAuditRunning.current = false;
    };
    processQueue();
  }, [exercises, isAdmin]);

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

  const toggleUserStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'blocked' : 'approved';
    try {
      const userRef = fbDoc(db, ...getUsersPath(), uid);
      await updateDoc(userRef, { status: newStatus });
      showToast(`Acesso do aluno alterado para: ${newStatus}`);
    } catch {
      showToast('Erro ao alterar acesso', 'error');
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authSubmitting) return;

    const email = loginEmail.trim().toLowerCase();
    if (!email) {
      showToast('Informe seu e-mail.', 'error');
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === 'login') {
        await fb.signInWithEmailAndPassword(auth, email, loginPassword);
      } else if (authMode === 'forgot') {
        await fb.sendPasswordResetEmail(auth, email);
        showToast('E-mail de recuperação enviado!');
        setAuthMode('login');
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
        await setDoc(userProfileRef, {
          uid: userCredential.user.uid,
          email,
          name: registerName.trim(),
          nickname: normalizedNickname,
          status: finalStatus,
          createdAt: new Date().toISOString(),
        });
        showToast(
          isPreAuthorized
            ? 'Acesso liberado instantaneamente! Bons treinos.'
            : 'Conta criada com sucesso! Aguarde liberação manual.'
        );
      }
    } catch (err) {
      showToast(
        getAuthErrorMessage(
          getAuthErrorCode(err),
          authMode === 'login'
            ? 'E-mail ou senha incorretos.'
            : authMode === 'forgot'
              ? 'Erro ao tentar enviar e-mail. Verifique o endereço.'
              : 'Erro ao criar conta. Tente novamente.'
        ),
        'error'
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleUpdateNickname = useCallback(
    async (nickname: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      const userProfileRef = fbDoc(db, ...getUserProfilePath(user.uid));
      await updateDoc(userProfileRef, { nickname });
    },
    [user]
  );

  const handleLogout = useCallback(async () => {
    try {
      await fb.signOut(auth);
      localStorage.removeItem('dmx_search');
      localStorage.removeItem('dmx_category');
      setSearchTerm('');
      setActiveCategory('Todos');
    } catch {
      showToast('Não foi possível encerrar a sessão. Tente novamente.', 'error');
    }
  }, [showToast]);


  const downloadExercise = async (ex: Exercise, quality: string) => {
    const gcpApiUrl = `https://storage.googleapis.com/storage/v1/b/biblioteca-dmx-videos-oficiais/o/${ex.id}_${quality}.mp4`;
    const mediaUrl = `https://storage.googleapis.com/biblioteca-dmx-videos-oficiais/${ex.id}_${quality}.mp4`;
    showToast('Verificando disponibilidade de dados...');
    try {
      const response = await fetch(gcpApiUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        showToast('Iniciando download seguro...');
        const noCacheUrl = `${mediaUrl}?t=${new Date().getTime()}`;
        const link = document.createElement('a');
        link.href = noCacheUrl;
        link.setAttribute('download', `${ex.name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_${quality}.mp4`);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        showToast(`O vídeo "${ex.name}" ainda não está disponível em ${quality}.`, 'error');
      }
    } catch {
      if (navigator.onLine)
        showToast(`O vídeo "${ex.name}" ainda não está disponível em ${quality}.`, 'error');
      else showToast('Falha de conexão à internet.', 'error');
    }
  };

  const handleDownloadCheck = async (e: React.MouseEvent, ex: Exercise, quality: string) => {
    e.stopPropagation();
    await downloadExercise(ex, quality);
  };

  const showAdminUI = isAdmin && !adminUserPreview;

  /** Exercícios visíveis para alunos — somente com YouTube válido */
  const publicExercises = useMemo(
    () => exercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl)),
    [exercises]
  );

  const searchableExercises = useMemo(
    () => (showAdminUI ? exercises : publicExercises),
    [exercises, publicExercises, showAdminUI]
  );

  const playlist = useMemo(() => {
    const byId = new Map(exercises.map((ex) => [ex.firestoreId, ex]));
    return playlistOrder.map((id) => byId.get(id)).filter((ex): ex is Exercise => !!ex);
  }, [playlistOrder, exercises]);

  useEffect(() => {
    localStorage.setItem('dmx_playlist_order', JSON.stringify(playlistOrder));
  }, [playlistOrder]);

  const searchIndexes = useMemo(
    () => searchableExercises.map(buildExerciseSearchIndex),
    [searchableExercises]
  );

  const filteredExercises = useMemo(() => {
    const validExercises = exercises.filter((ex) => {
      const youtubeOk = hasValidYouTubeUrl(ex.youtubeUrl);
      if (showAdminUI) {
        if (adminFilter === 'completed') return youtubeOk;
        if (adminFilter === 'incomplete') return !youtubeOk;
        if (adminFilter === 'missing_cloud') return youtubeOk && ex.hasCloudVideo === false;
        if (adminFilter === 'upados_cloud') return youtubeOk && ex.hasCloudVideo === true;
        return true;
      }
      return youtubeOk;
    });

    const categoryFiltered = filterExercisesByCategory(validExercises, activeCategory, favorites);

    if (!searchTerm.trim()) return categoryFiltered;

    const indexById = new Map(searchIndexes.map((idx) => [idx.exercise.firestoreId, idx]));
    /** Com busca ativa: pesquisa em todos os exercícios públicos (ignora categoria) */
    const searchPool = showAdminUI ? validExercises : publicExercises;
    const scopedIndexes = searchPool
      .map((ex) => indexById.get(ex.firestoreId))
      .filter((idx): idx is NonNullable<typeof idx> => !!idx);

    return rankExercises(scopedIndexes, searchTerm).map((r) => r.exercise);
  }, [searchTerm, activeCategory, exercises, showAdminUI, adminFilter, searchIndexes, favorites, publicExercises]);

  const searchSuggestions = useMemo(() => {
    if (searchTerm.trim().length < 2) return [];
    const indexById = new Map(searchIndexes.map((idx) => [idx.exercise.firestoreId, idx]));
    const scopedIndexes = searchableExercises
      .map((ex) => indexById.get(ex.firestoreId))
      .filter((idx): idx is NonNullable<typeof idx> => !!idx);
    return rankExercises(scopedIndexes, searchTerm)
      .slice(0, 6)
      .map((r) => r.exercise);
  }, [searchTerm, searchableExercises, searchIndexes]);

  const publicExerciseIds = useMemo(
    () => new Set(publicExercises.map((ex) => ex.firestoreId)),
    [publicExercises]
  );

  const visibleRecents = useMemo(
    () => recents.filter((r) => publicExerciseIds.has(r.firestoreId) || showAdminUI),
    [recents, publicExerciseIds, showAdminUI]
  );

  const featuredExercise = useMemo(() => {
    if (searchTerm.trim() || activeCategory !== 'Todos') return null;
    const pool = exercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl));
    const favoritePool = pool.filter((ex) => favorites.has(ex.firestoreId));
    const wodPool = favoritePool.length > 0 ? favoritePool : pool;
    return pickDailyFeaturedExercise(wodPool);
  }, [searchTerm, activeCategory, exercises, favorites]);

  const featuredFromFavorites = useMemo(() => {
    if (searchTerm.trim() || activeCategory !== 'Todos') return false;
    const pool = exercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl));
    return pool.some((ex) => favorites.has(ex.firestoreId));
  }, [searchTerm, activeCategory, exercises, favorites]);

  const gridExercises = useMemo(() => {
    if (!featuredExercise || searchTerm.trim() || activeCategory !== 'Todos') {
      return filteredExercises;
    }
    return filteredExercises.filter((ex) => ex.firestoreId !== featuredExercise.firestoreId);
  }, [filteredExercises, featuredExercise, searchTerm, activeCategory]);

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
        showToast('URL copiada com sucesso!');
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
      showToast('URL copiada com sucesso!');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const closeLightbox = useCallback(() => {
    setActiveVideo(null);
    setCompareEx(null);
  }, []);

  const watchExercise = useCallback(
    (ex: Exercise) => {
      setCompareEx(null);
      setActiveVideo(ex);
      addRecent(ex);
    },
    [addRecent]
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
      addRecent(comparePick);
      addRecent(ex);
      setActiveVideo(comparePick);
      setCompareEx(ex);
      setComparePick(null);
    },
    [comparePick, addRecent, showToast, watchExercise]
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
  const lightboxNavList = useMemo(() => {
    if (isPlaylistActive && playlist.length > 1) return playlist;
    return filteredExercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl));
  }, [isPlaylistActive, playlist, filteredExercises]);

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

  const handleRecentWatch = useCallback(
    (firestoreId: string) => {
      const ex = exercises.find((e) => e.firestoreId === firestoreId);
      if (!ex) return;
      if (!showAdminUI && !hasValidYouTubeUrl(ex.youtubeUrl)) return;
      watchExercise(ex);
    },
    [exercises, watchExercise, showAdminUI]
  );

  const pageKey = searchTerm.trim()
    ? `search-${searchTerm.trim().slice(0, 40)}`
    : `browse-${activeCategory}`;

  useEffect(() => {
    if (isCoarsePointer()) return;
    const timer = window.setTimeout(() => {
      void preloadYouTubePlayerApi();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || publicExercises.length === 0) return;
    const limit = isMobileUi() ? 10 : 80;
    const warmItems = publicExercises
      .slice(0, limit)
      .map((ex) => ({
        firestoreId: ex.firestoreId,
        url: buildExerciseImageFallbacks(ex)[0],
      }))
      .filter((item) => item.url);
    warmSessionCovers(warmItems);
    if (!isMobileUi()) {
      prefetchCoverUrls(warmItems.map((i) => i.url));
    }
  }, [loading, publicExercises]);

  useEffect(() => {
    if (loading || gridExercises.length === 0) return;
    const limit = isMobileUi() ? 8 : 48;
    const warmItems = gridExercises.slice(0, limit).map((ex) => ({
      firestoreId: ex.firestoreId,
      url: buildExerciseImageFallbacks(ex)[0],
    })).filter((item) => item.url);
    warmSessionCovers(warmItems);
    if (!isMobileUi()) {
      prefetchCoverUrls(warmItems.map((i) => i.url));
    }
  }, [loading, gridExercises]);

  if (authLoading) {
    return <LoadingScreen slowConnection={slowConnection} />;
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
        />
      </>
    );
  }

  if (!isAdmin && userProfile && userProfile.status !== 'approved') {
    return <PendingAccessScreen onLogout={handleLogout} />;
  }

  return (
    <div className="page-canvas min-h-screen flex flex-col relative font-sans text-[var(--dmx-fg)]">
      <AnimatePresence>
        {activeVideo && (
          <Suspense fallback={null}>
            <CinemaLightbox
            key={compareEx ? 'compare' : 'cinema'}
            ex={activeVideo}
            compareEx={compareEx}
            onClose={closeLightbox}
            copyLink={copyLink}
            copiedId={copiedId}
            onDownload={downloadExercise}
            onDownloadUnavailable={(ex, quality) =>
              showToast(`"${ex.name}" em ${quality} estará disponível em breve!`)
            }
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
          />
          </Suspense>
        )}
      </AnimatePresence>
      <Toast toast={toast} onClose={() => setToast({ show: false, msg: '', type: 'success' })} />
      {showRequestModal && (
        <RequestModal
          requestForm={requestForm}
          setRequestForm={setRequestForm}
          onSubmit={handleRequestSubmit}
          onClose={() => setShowRequestModal(false)}
        />
      )}

      <SiteHeader
        user={user}
        userProfile={userProfile}
        onUpdateNickname={handleUpdateNickname}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchCommit={addSearch}
        searchHistory={history}
        searchRecents={visibleRecents}
        onSelectHistory={setSearchTerm}
        onSelectRecent={(_id, name) => setSearchTerm(name)}
        onRemoveHistoryItem={removeHistoryItem}
        onClearHistory={clearHistory}
        onRecentWatch={handleRecentWatch}
        searchSuggestions={searchSuggestions}
        onSelectSuggestion={(ex) => {
          if (!showAdminUI && !hasValidYouTubeUrl(ex.youtubeUrl)) return;
          addSearch(ex.name);
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
      />

      {showAdminUI && (
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

      <CategoryNav
        categories={NAV_CATEGORIES}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        favoritesCount={favorites.size}
      />

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

      <main className="cinema-container w-full flex-1 pb-fluid-xl relative z-10">
        {isMobileLayout ? (
          <div key={pageKey}>
        {!searchTerm && activeCategory === 'Todos' && featuredExercise && (
          <HeroBanner
            ex={featuredExercise}
            onWatch={watchExercise}
            fromFavorites={featuredFromFavorites}
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
          <div className="flex flex-col items-center justify-center py-fluid-2xl px-fluid-md">
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-fluid-md text-zinc-600 shadow-cinematic">
              <Icon name="search" className="w-10 h-10" />
            </div>
            <h3 className="font-display text-xl font-black text-white mb-2 text-center uppercase italic leading-title">
              Nenhum resultado
            </h3>
            <p className="text-body text-sm text-zinc-400 text-center max-w-md mb-fluid-lg">
              Não encontrámos nenhum exercício correspondente à sua busca.
            </p>
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={() => {
                  setRequestForm({ name: searchTerm, details: '' });
                  setShowRequestModal(true);
                }}
                className="cta-pill font-black uppercase tracking-widest text-2xs hover:bg-red-600 hover:text-white shadow-cinematic"
              >
                <Icon name="lightbulb" className="w-5 h-5" /> Sugerir a gravação de &quot;{searchTerm}&quot;
              </button>
            )}
          </div>
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
                showToast={showToast}
                setForm={setForm}
                setEditingId={setEditingId}
                setAdminTab={setAdminTab}
                setShowAdminPanel={setShowAdminPanel}
                copyLink={copyLink}
                copiedId={copiedId}
                onWatch={watchExercise}
                selectionMode={selectionMode}
                isInPlaylist={playlistOrder.includes(ex.firestoreId)}
                playlistSequence={
                  selectionMode
                    ? playlistOrder.indexOf(ex.firestoreId) >= 0
                      ? playlistOrder.indexOf(ex.firestoreId) + 1
                      : undefined
                    : undefined
                }
                onTogglePlaylist={togglePlaylistItem}
                isFavorite={isFavorite(ex.firestoreId)}
                onToggleFavorite={() => toggleFavorite(ex.firestoreId)}
                onCompare={isFeatureEnabled('compare') ? handleCompare : undefined}
                isComparePick={comparePick?.firestoreId === ex.firestoreId}
              />
            ))}
          </div>
        )}
          </div>
        ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={pageKey}
            variants={pageTransition}
            initial="initial"
            animate="animate"
            exit="exit"
          >
        {!searchTerm && activeCategory === 'Todos' && featuredExercise && (
          <HeroBanner
            ex={featuredExercise}
            onWatch={watchExercise}
            fromFavorites={featuredFromFavorites}
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
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-fluid-2xl px-fluid-md"
          >
            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-fluid-md text-zinc-600 shadow-cinematic">
              <Icon name="search" className="w-10 h-10" />
            </div>
            <h3 className="font-display text-xl font-black text-white mb-2 text-center uppercase italic leading-title">
              Nenhum resultado
            </h3>
            <p className="text-body text-sm text-zinc-400 text-center max-w-md mb-fluid-lg">
              Não encontrámos nenhum exercício correspondente à sua busca.
            </p>
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={() => {
                  setRequestForm({ name: searchTerm, details: '' });
                  setShowRequestModal(true);
                }}
                className="cta-pill font-black uppercase tracking-widest text-2xs hover:bg-red-600 hover:text-white shadow-cinematic"
              >
                <Icon name="lightbulb" className="w-5 h-5" /> Sugerir a gravação de &quot;{searchTerm}&quot;
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
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
                showToast={showToast}
                setForm={setForm}
                setEditingId={setEditingId}
                setAdminTab={setAdminTab}
                setShowAdminPanel={setShowAdminPanel}
                copyLink={copyLink}
                copiedId={copiedId}
                onWatch={watchExercise}
                selectionMode={selectionMode}
                isInPlaylist={playlistOrder.includes(ex.firestoreId)}
                playlistSequence={
                  selectionMode
                    ? playlistOrder.indexOf(ex.firestoreId) >= 0
                      ? playlistOrder.indexOf(ex.firestoreId) + 1
                      : undefined
                    : undefined
                }
                onTogglePlaylist={togglePlaylistItem}
                isFavorite={isFavorite(ex.firestoreId)}
                onToggleFavorite={() => toggleFavorite(ex.firestoreId)}
                onCompare={isFeatureEnabled('compare') ? handleCompare : undefined}
                isComparePick={comparePick?.firestoreId === ex.firestoreId}
              />
            ))}
          </motion.div>
        )}
          </motion.div>
        </AnimatePresence>
        )}
      </main>

      <PlaylistBar
        playlist={playlist}
        selectionMode={selectionMode}
        onToggleSelectionMode={() => setSelectionMode((v) => !v)}
        onPlay={playPlaylist}
        onClear={() => setPlaylistOrder([])}
      />

      {showAdminPanel && showAdminUI && (
        <Suspense fallback={null}>
        <AdminPanel
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          editingId={editingId}
          form={form}
          setForm={setForm}
          onClose={closeAdminPanel}
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
          onToggleUserStatus={toggleUserStatus}
          isAuditing={isAuditing}
          auditProgress={auditProgress}
          auditCurrentItem={auditCurrentItem}
          auditStats={auditStats}
          onRunCloudAudit={runCloudAudit}
          appSettings={appSettings}
          setAppSettings={setAppSettings}
          onSaveSettings={saveSettings}
        />
        </Suspense>
      )}
    </div>
  );
}
