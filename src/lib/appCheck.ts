import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import type { FirebaseApp } from 'firebase/app';
import { logDebug, logWarn } from './utils';

declare global {
  // Token de debug para localhost — definir antes de initializeAppCheck
  // https://firebase.google.com/docs/app-check/web/debug-provider
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

export const isAppCheckConfigured = Boolean(
  import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim()
);

function configureAppCheckDebugToken(): void {
  const debugSetting = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN?.trim();
  if (!debugSetting) return;

  if (debugSetting === 'true') {
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    logDebug(
      'AppCheck',
      'Modo debug ativo — copie o token exibido no console e registre em Firebase → App Check → Gerenciar tokens de debug.'
    );
    return;
  }

  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = debugSetting;
  logDebug('AppCheck', 'Token de debug fixo carregado da env.');
}

/**
 * App Check em modo cliente — coleta tokens para métricas no Firebase Console.
 * Enforce vs monitor é definido no Console (APIs → App Check), não no código.
 * Só inicializa se VITE_RECAPTCHA_ENTERPRISE_SITE_KEY estiver configurada.
 */
export function initAppCheck(app: FirebaseApp): void {
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?.trim();
  if (!siteKey) {
    if (import.meta.env.PROD) {
      logWarn(
        'AppCheck',
        'VITE_RECAPTCHA_ENTERPRISE_SITE_KEY ausente — App Check desativado em produção.'
      );
    }
    return;
  }

  if (import.meta.env.DEV) {
    configureAppCheckDebugToken();
  }

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
    logDebug(
      'AppCheck',
      'Ativo — pronto para enforce no Firebase Console (Firestore + Authentication).'
    );
  } catch (err) {
    logWarn('AppCheck', 'Falha ao inicializar; o app continua sem App Check.', err);
  }
}
