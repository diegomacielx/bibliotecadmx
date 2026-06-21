export const ADMIN_EMAILS = ['diego.maciel.965@gmail.com', 'contatomacielx@gmail.com'];

/** Arquivos locais em public/brand/ — substitua por sua logo (SVG recomendado) */
export const BRAND_LOGO_CANDIDATES = [
  '/brand/logo.svg',
  '/brand/logo.png',
  '/brand/logo.webp',
] as const;

/** Logo escura para tema claro */
export const BRAND_LOGO_LIGHT_CANDIDATES = [
  '/brand/logo-dark.svg',
  '/brand/logo.svg',
  '/brand/logo.png',
] as const;

export const CUSTOM_LOGO_FALLBACK = 'https://i.imgur.com/rLLYQ3Z.png';

/** @deprecated Use BrandLogo — mantido para thumbnails e fallbacks genéricos */
export const CUSTOM_LOGO_URL = CUSTOM_LOGO_FALLBACK;

export const APP_ID = import.meta.env.VITE_APP_ID || 'dmx-exercicios-cloud';

export const CATEGORIES = [
  'Todos',
  'Quadríceps',
  'Posteriores',
  'Glúteos',
  'Adutores',
  'Panturrilha',
  'Peitoral',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Core',
] as const;

/** Desktop — inclui Favoritos na barra de categorias */
export const NAV_CATEGORIES = ['Todos', 'Favoritos', ...CATEGORIES.slice(1)] as const;

/** Mobile — sem Favoritos (aba dedicada no rodapé), demais categorias em ordem alfabética */
export const MOBILE_CATEGORY_NAV = [
  'Todos',
  ...CATEGORIES.slice(1).slice().sort((a, b) => a.localeCompare(b, 'pt-BR')),
] as const;

export const DEFAULT_FORM = {
  id: '',
  name: '',
  category: 'Quadríceps',
  muscleGroups: '',
  youtubeUrl: '',
  thumbnail: '',
  keywords: '',
  equipment: [] as string[],
  hasCloudVideo: null as boolean | null,
  coverFocusY: '',
  coverFocusX: '',
  coverZoom: '',
  coverFramingManual: false,
};
