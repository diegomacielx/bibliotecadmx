export interface Exercise {
  firestoreId: string;
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  youtubeUrl: string;
  thumbnail?: string;
  keywords?: string[];
  hasCloudVideo?: boolean | null;
  /** "vertical" | "horizontal" — orientação do vídeo no lightbox */
  videoOrientation?: string;
  /** "9/16" | "16/9" — fallback de orientação */
  aspectRatio?: string;
  /** 0–100: foco vertical da capa (0=topo, 50=centro). Opcional no Firestore. */
  coverFocusY?: number;
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
  hasCloudVideo?: boolean | null;
  /** Vazio = automático; 0–100 = foco manual da capa */
  coverFocusY: string;
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

export interface AppSettings {
  webhookUrl?: string;
  access?: AccessIntegrationSettings;
  /** Região das Cloud Functions (ex.: us-central1) — só exibição no admin */
  functionsRegion?: string;
}

export type ToastType = 'success' | 'error';

export interface ToastState {
  show: boolean;
  msg: string;
  type: ToastType;
}

export type AuthMode = 'login' | 'register' | 'forgot';
export type AdminTab = 'single' | 'batch' | 'requests' | 'authorized' | 'audit' | 'users' | 'settings';
export type AdminFilter = 'all' | 'completed' | 'incomplete' | 'missing_cloud' | 'upados_cloud';
