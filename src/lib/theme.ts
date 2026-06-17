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

  void runThemeWaveTransition(mode);
}

/** Executar antes do React montar para evitar flash */
export function initTheme(): ThemeMode {
  const mode = getStoredTheme();
  applyTheme(mode);
  return mode;
}
