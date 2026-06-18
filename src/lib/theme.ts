import { isThemeWaveActive, runThemeWaveTransition } from './themeWave';

export type ThemeMode = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'dmx_theme';
export const DEFAULT_THEME: ThemeMode = 'dark';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light';
}

export function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(raw) ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

function shouldRunThemeWave(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (window.matchMedia('(max-width: 767px)').matches) return false;
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return false;
  return true;
}

export function setTheme(mode: ThemeMode): void {
  const domTheme = document.documentElement.dataset.theme as ThemeMode | undefined;
  const waveActive = isThemeWaveActive();

  if (waveActive && domTheme === mode) {
    return;
  }

  if (!waveActive && domTheme === mode) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }

  if (!shouldRunThemeWave()) {
    applyTheme(mode);
    return;
  }

  void runThemeWaveTransition(mode);
}

/** Executar antes do React montar para evitar flash */
export function initTheme(): ThemeMode {
  const mode = getStoredTheme();
  applyTheme(mode);
  return mode;
}
