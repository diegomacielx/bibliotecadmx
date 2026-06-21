import type { AdminTab } from '../types';

/** Abas do admin recomendadas no celular */
export const MOBILE_ADMIN_QUICK_TABS: readonly AdminTab[] = ['users', 'requests', 'single'];

/** Abas complexas — aviso de desktop, mas acessíveis se o admin insistir */
export const MOBILE_ADMIN_DESKTOP_TABS: readonly AdminTab[] = [
  'batch',
  'authorized',
  'audit',
  'settings',
];

export type MobileAdminTab = 'catalog' | 'users' | 'requests' | 'more';

export function isMobileAdminQuickTab(tab: AdminTab): boolean {
  return (MOBILE_ADMIN_QUICK_TABS as readonly string[]).includes(tab);
}

export function isMobileAdminDesktopTab(tab: AdminTab): boolean {
  return (MOBILE_ADMIN_DESKTOP_TABS as readonly string[]).includes(tab);
}

export const MOBILE_ADMIN_BANNER_DISMISSED_KEY = 'dmx_mobile_admin_banner_dismissed';

export function readMobileAdminBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MOBILE_ADMIN_BANNER_DISMISSED_KEY) === 'true';
}
