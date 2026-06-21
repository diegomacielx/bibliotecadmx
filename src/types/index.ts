export interface Exercise {
  firestoreId: string;
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  youtubeUrl: string;
  thumbnail?: string;
  keywords?: string[];
  /** Equipamentos do exercício — usado pelo filtro avançado */
  equipment?: string[];
  hasCloudVideo?: boolean | null;
  /** "vertical" | "horizontal" — orientação do vídeo no lightbox */
  videoOrientation?: string;
  /** "9/16" | "16/9" — fallback de orientação */
  aspectRatio?: string;
  /** 0–100: foco vertical da capa (0=topo, 50=centro). Opcional no Firestore. */
  coverFocusY?: number;
  /** 0–100: foco horizontal da capa (50=centro). Opcional no Firestore. */
  coverFocusX?: number;
  /** 0.75–1.6: zoom da capa (1=original). Opcional no Firestore. */
  coverZoom?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExerciseForm {
  id: string;
  name: string;
  category: string;
  muscleGroups: string;
  youtubeUrl: string;
  thumbnail: string;
  keywords: string;
  /** IDs de equipamento selecionados no admin */
  equipment: string[];
  hasCloudVideo?: boolean | null;
  /** Vazio = automático; 0–100 = foco manual da capa */
  coverFocusY: string;
  coverFocusX: string;
  /** Percentual 75–160; vazio = automático (100%) */
  coverZoom: string;
  coverFramingManual: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  /** Apelido exibido no header e na comunidade */
  nickname?: string;
  status: 'approved' | 'pending' | 'blocked';
  createdAt: string;
  accessSyncedAt?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  thumbnail?: string;
  type?: string;
  targetUserId?: string;
  exerciseId?: string;
  createdAt: string;
}

export interface ExerciseRequest {
  id: string;
  exerciseName: string;
  details?: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  createdAt: string;
}

export interface AuthorizedEmail {
  email: string;
  source: string;
  authorizedAt?: string;
  accessStatus?: 'active' | 'revoked';
  orderId?: string;
  productId?: string;
  productName?: string;
  lastEvent?: string;
  revokedAt?: string;
}

export interface AccessIntegrationSettings {
  /** IDs de produto Kiwify permitidos — vazio = todos */
  kiwifyProductIds?: string[];
  /** IDs de price Stripe permitidos — vazio = todos */
  stripePriceIds?: string[];
}

export type HeroCampaignRotation = 'queue' | 'random' | 'priority';

export type HeroCampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';

export interface HeroCampaign {
  id: string;
  /** Nome interno no admin (ex.: «Cliente X — março») */
  label?: string;
  enabled: boolean;
  imageUrl: string;
  title: string;
  subtitle?: string;
  categoryLabel?: string;
  ctaLabel?: string;
  linkUrl?: string;
  coverFocusX?: number;
  coverFocusY?: number;
  coverZoom?: number;
  /** ISO 8601 — início da veiculação (opcional) */
  startAt?: string;
  /** ISO 8601 — fim da veiculação (opcional) */
  endAt?: string;
  /** Menor = maior prioridade na fila */
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroCampaignStats {
  impressions: number;
  clicks: number;
}

export interface HeroSpotlightSettings {
  /** daily = sorteio diário · exercise = exercício fixo · campaign = campanhas / outdoor */
  mode?: 'daily' | 'exercise' | 'campaign';
  exerciseFirestoreId?: string;
  /** @deprecated Use `campaigns[]` — mantido para migração automática */
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  categoryLabel?: string;
  ctaLabel?: string;
  linkUrl?: string;
  coverFocusX?: number;
  coverFocusY?: number;
  coverZoom?: number;
  /** Campanhas veiculadas no destaque */
  campaigns?: HeroCampaign[];
  /** Como escolher entre campanhas ativas no período */
  campaignRotation?: HeroCampaignRotation;
  /** Métricas por campanha (impressões / cliques) */
  stats?: Record<string, HeroCampaignStats>;
}

export interface AppSettings {
  webhookUrl?: string;
  access?: AccessIntegrationSettings;
  /** Região das Cloud Functions (ex.: us-central1) — só exibição no admin */
  functionsRegion?: string;
  heroSpotlight?: HeroSpotlightSettings;
}

export type ToastType = 'success' | 'error';

export interface ToastState {
  show: boolean;
  msg: string;
  type: ToastType;
}

export type AuthMode = 'login' | 'register' | 'forgot' | 'forgot-sent';

export interface UserPlaybackSettings {
  videoLoop: boolean;
  /** No comparador: reiniciar os dois vídeos juntos ao terminar um deles (padrão: desligado). */
  compareLoopSync?: boolean;
}
export type AdminTab = 'single' | 'batch' | 'requests' | 'authorized' | 'audit' | 'users' | 'settings';
export type AdminFilter =
  | 'all'
  | 'completed'
  | 'incomplete'
  | 'missing_cloud'
  | 'upados_cloud'
  | 'missing_cover';
