import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_THEME,
  getStoredTheme,
  setTheme as persistTheme,
  type ThemeMode,
} from '../lib/theme';

function subscribe(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === 'dmx_theme') onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener('dmx-theme-change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('dmx-theme-change', onStoreChange);
  };
}

function getSnapshot(): ThemeMode {
  return getStoredTheme();
}

function notifyThemeChange() {
  window.dispatchEvent(new Event('dmx-theme-change'));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_THEME);

  const setTheme = useCallback((mode: ThemeMode) => {
    persistTheme(mode);
    notifyThemeChange();
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, setTheme, toggleTheme, isDark: theme === 'dark' };
}
