import { APP_ID } from './constants';
import { getCachedCoverUrl } from './coverCache';

const LEGACY_EXERCISES_PATH = ['artifacts', APP_ID, 'public', 'data', 'exercises'] as const;

export const GITHUB_COVER_BASE = 'https://raw.githubusercontent.com/diegomacielx/dmx/main';

/** Logs de depuração — visíveis no console do navegador (filtro: DMX) */
export const logDebug = (tag: string, ...args: unknown[]) => {
  console.debug(`[DMX:${tag}]`, ...args);
};

export const logWarn = (tag: string, ...args: unknown[]) => {
  console.warn(`[DMX:${tag}]`, ...args);
};

export const logError = (tag: string, ...args: unknown[]) => {
  console.error(`[DMX:${tag}]`, ...args);
};

/** Caminho legado com prefixo artifacts (estrutura Firebase Studio) */
export const getLegacyDbPath = (): string[] => [...LEGACY_EXERCISES_PATH];

/**
 * Caminho da coleção de exercícios no Firestore.
 * Padrão: path legado Firebase Studio (artifacts/APP_ID/public/data/exercises).
 * Override via VITE_FIRESTORE_EXERCISES_PATH
 */
export const getRootExercisesPath = (): string[] => ['exercises'];

export const getDbPath = (): string[] => {
  const envPath = import.meta.env.VITE_FIRESTORE_EXERCISES_PATH as string | undefined;
  if (envPath?.trim()) {
    return envPath.split('/').filter(Boolean);
  }
  return getLegacyDbPath();
};

/** Alterna entre path legado e coleção raiz `exercises` */
export const getAlternateExercisesPath = (current: string[]): string[] => {
  const legacy = getLegacyDbPath().join('/');
  const root = getRootExercisesPath().join('/');
  const currentStr = current.join('/');
  if (currentStr === legacy) return getRootExercisesPath();
  if (currentStr === root) return getLegacyDbPath();
  return getLegacyDbPath();
};

/** Detecta YouTube Shorts ou vídeo marcado como vertical nos metadados do exercício */
export const isYouTubeShort = (url: string | undefined | null): boolean => {
  if (!url) return false;
  const trimmed = String(url).trim().toLowerCase();
  return /\/shorts\//.test(trimmed) || /[?&]shorts=1/.test(trimmed);
};

export type VideoOrientation = 'vertical' | 'horizontal';

export const resolveVideoOrientation = (
  youtubeUrl: string | undefined | null,
  meta?: { videoOrientation?: string; aspectRatio?: string }
): VideoOrientation => {
  if (isYouTubeShort(youtubeUrl)) return 'vertical';
  if (meta?.videoOrientation === 'vertical' || meta?.aspectRatio === '9/16') return 'vertical';
  if (meta?.videoOrientation === 'horizontal' || meta?.aspectRatio === '16/9') return 'horizontal';
  // Biblioteca DMX: execuções gravadas em vertical; use aspectRatio "16/9" no Firestore para landscape
  return 'vertical';
};

export const getExerciseCoverUrl = (exerciseId: string, ext: 'jpg' | 'JPG' | 'png' | 'PNG' = 'png'): string =>
  `${GITHUB_COVER_BASE}/${exerciseId}.${ext}`;

/** Normaliza ID numérico para assets (ex: "1" → "0001") */
export const normalizeExerciseIdForAssets = (id: string | undefined | null): string => {
  const s = String(id ?? '').trim();
  if (!s) return s;
  if (/^\d+$/.test(s)) return s.padStart(4, '0');
  return s;
};

/** Variantes de ID para assets GitHub (0001, 1, etc.) */
export function getExerciseAssetIds(id: string | undefined | null): string[] {
  const raw = String(id ?? '').trim();
  if (!raw) return [];
  const ids = new Set<string>([raw, normalizeExerciseIdForAssets(raw)]);
  if (/^\d+$/.test(raw)) {
    ids.add(String(parseInt(raw, 10)));
    ids.add(raw.padStart(4, '0'));
  }
  return [...ids].filter(Boolean);
}

const PLACEHOLDER_URL_VALUES = new Set([
  '',
  '.',
  '..',
  '...',
  '-',
  '--',
  'url',
  'link',
  'video',
  'youtube',
  'none',
  'null',
  'undefined',
  'na',
  'n/a',
  'tbd',
  'pending',
  'pendente',
]);

const PLACEHOLDER_TEXT_PATTERN =
  /revisar|placeholder|preencher|inserir|colocar|sem[\s_-]?link|faltando|example\.com|xxx{3,}|^test$|^demo$|^sample$|^fake$/i;

const INVALID_VIDEO_ID_PATTERN =
  /revisar|placeholder|xxxx|^x{5,}$|^0{11}$|^1{11}$|^test|^demo|^sample|^fake|^null|^undefined|^url$|^link$/i;

function decodeUrlSafe(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

/** Extrai o valor bruto do ID (mesmo se inválido — ex: REVISAR_LINK) */
function extractRawYouTubeId(url: string): string | null {
  const trimmed = decodeUrlSafe(String(url).trim());
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && !trimmed.includes('.')) {
    return trimmed;
  }

  const vMatch = trimmed.match(/[?&]v=([^&#?/]+)/i);
  if (vMatch?.[1]) return vMatch[1].trim();

  const shortMatch = trimmed.match(/youtu\.be\/([^?&#/]+)/i);
  if (shortMatch?.[1]) return shortMatch[1].trim();

  const shortsMatch = trimmed.match(/\/shorts\/([^?&#/]+)/i);
  if (shortsMatch?.[1]) return shortsMatch[1].trim();

  const embedMatch = trimmed.match(/(?:embed\/|\/v\/)([^?&#/]+)/i);
  if (embedMatch?.[1]) return embedMatch[1].trim();

  return null;
}

export const isValidYouTubeVideoId = (videoId: string | null | undefined): boolean => {
  if (!videoId) return false;
  const id = videoId.trim();
  if (id.length !== 11) return false;
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) return false;
  return !INVALID_VIDEO_ID_PATTERN.test(id);
};

/** ID de vídeo real e utilizável — null se placeholder ou inválido */
export const resolveYouTubeVideoId = (url: string | undefined | null): string | null => {
  if (url == null) return null;
  const trimmed = decodeUrlSafe(String(url).trim());
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/\s+/g, '');
  if (PLACEHOLDER_URL_VALUES.has(normalized)) return null;
  if (PLACEHOLDER_TEXT_PATTERN.test(trimmed)) return null;

  const rawId = extractRawYouTubeId(trimmed);
  if (!rawId) return null;

  if (PLACEHOLDER_TEXT_PATTERN.test(rawId)) return null;
  if (!isValidYouTubeVideoId(rawId)) return null;

  return rawId;
};

export const hasValidYouTubeUrl = (url: string | undefined | null): boolean =>
  resolveYouTubeVideoId(url) !== null;

/** URL claramente inválida ou placeholder (não é link real de vídeo) */
export const isPlaceholderYouTubeUrl = (url: string | undefined | null): boolean => {
  if (url == null) return true;
  const trimmed = String(url).trim();
  if (!trimmed) return true;
  return !hasValidYouTubeUrl(trimmed);
};

export const isInvalidYouTubeVideoId = (videoId: string | null | undefined): boolean =>
  !isValidYouTubeVideoId(videoId);

export const isExerciseIncomplete = (url: string | undefined | null): boolean =>
  !hasValidYouTubeUrl(url);

export const getYouTubeId = (url: string | undefined | null): string | null =>
  resolveYouTubeVideoId(url);

/** Lista ordenada de URLs de capa: cache → thumbnail → GitHub → YouTube */
export const buildExerciseImageFallbacks = (ex: {
  firestoreId?: string;
  id: string;
  thumbnail?: string;
  youtubeUrl?: string;
}): string[] => {
  const urls: string[] = [];

  if (ex.firestoreId) {
    const cached = getCachedCoverUrl(ex.firestoreId);
    if (cached) urls.push(cached);
  }

  const thumb = ex.thumbnail?.trim();
  if (thumb && !isPlaceholderYouTubeUrl(thumb) && !PLACEHOLDER_URL_VALUES.has(thumb.toLowerCase())) {
    urls.push(thumb);
  }

  for (const assetId of getExerciseAssetIds(ex.id)) {
    for (const ext of ['png', 'PNG', 'jpg', 'JPG'] as const) {
      urls.push(getExerciseCoverUrl(assetId, ext));
    }
  }

  if (!isExerciseIncomplete(ex.youtubeUrl)) {
    const ytId = getYouTubeId(ex.youtubeUrl);
    if (ytId) {
      urls.push(`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`);
      urls.push(`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`);
      urls.push(`https://img.youtube.com/vi/${ytId}/sddefault.jpg`);
      urls.push(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`);
      urls.push(`https://img.youtube.com/vi/${ytId}/0.jpg`);
    }
  }

  return [...new Set(urls)];
};

export const getPrimaryExerciseImage = (ex: {
  firestoreId?: string;
  id: string;
  thumbnail?: string;
  youtubeUrl?: string;
}): string => buildExerciseImageFallbacks(ex)[0] ?? '';

export const getYouTubeEmbedUrl = (
  youtubeUrl: string | undefined | null,
  options: {
    autoplay?: boolean;
    mute?: boolean;
    controls?: boolean;
    loop?: boolean;
    maxQuality?: boolean;
  } = {}
): string | null => {
  const ytId = getYouTubeId(youtubeUrl);
  if (!ytId) return null;

  const { autoplay = false, mute = false, controls = true, loop = false, maxQuality = true } = options;
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: mute ? '1' : '0',
    controls: controls ? '1' : '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    iv_load_policy: '3',
  });
  if (maxQuality) {
    params.set('vq', 'hd2160');
  }
  if (loop) {
    params.set('loop', '1');
    params.set('playlist', ytId);
  }
  return `https://www.youtube.com/embed/${ytId}?${params.toString()}`;
};

export const parseCommaList = (value: string | string[] | undefined): string[] => {
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(value)) return value;
  return [];
};

export const normalizeString = (str: string | undefined | null): string => {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export const getNotifPath = (): string[] => [...LEGACY_EXERCISES_PATH.slice(0, -1), 'notifications'];

export const getRequestsPath = (): string[] =>
  ['artifacts', APP_ID, 'public', 'data', 'exercise_requests'];

export const getUsersPath = (): string[] =>
  ['artifacts', APP_ID, 'public', 'data', 'app_users'];

export const getAuthorizedPath = (): string[] =>
  ['artifacts', APP_ID, 'public', 'data', 'authorized_emails'];

export const getSettingsPath = (): string[] =>
  ['artifacts', APP_ID, 'public', 'data', 'settings', 'integrations'];

export const getUserProfilePath = (uid: string): string[] =>
  ['artifacts', APP_ID, 'public', 'data', 'app_users', uid];

export const getUserNotifSettingsPath = (uid: string): string[] =>
  ['artifacts', APP_ID, 'users', uid, 'settings', 'notifications'];
