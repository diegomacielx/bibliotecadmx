export type AuthActionMode = 'resetPassword' | 'verifyEmail' | 'recoverEmail';

export interface AuthActionParams {
  mode: AuthActionMode;
  oobCode: string;
}

/** Extrai parâmetros de ação do Firebase Auth da URL atual. */
export function parseAuthActionParams(): AuthActionParams | null {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const sources = [
    url.searchParams,
    new URLSearchParams(url.hash.replace(/^#/, '')),
  ];

  for (const params of sources) {
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    if (
      oobCode &&
      (mode === 'resetPassword' || mode === 'verifyEmail' || mode === 'recoverEmail')
    ) {
      return { mode, oobCode };
    }
  }
  return null;
}

/** Remove parâmetros sensíveis da URL após processar a ação. */
export function clearAuthActionParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.searchParams.delete('oobCode');
  url.searchParams.delete('apiKey');
  url.searchParams.delete('lang');
  url.searchParams.delete('continueUrl');
  const clean = url.pathname + (url.search ? url.search : '') + url.hash.split('?')[0];
  window.history.replaceState({}, document.title, clean || '/');
}
