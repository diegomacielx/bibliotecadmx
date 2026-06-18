import { getCachedCoverUrl, rememberCoverUrl, forgetCoverUrl } from './coverCache';
import { isOfficialGitHubCoverUrl } from './coverSource';

/** Capas já resolvidas nesta sessão — evita reload ao trocar categoria */
const sessionResolved = new Map<string, string>();
const sessionLoading = new Set<string>();

function isValidCoverUrl(url: string | null | undefined): url is string {
  return !!url && isOfficialGitHubCoverUrl(url);
}

export function getSessionCoverUrl(firestoreId: string): string | null {
  if (!firestoreId) return null;
  const fromSession = sessionResolved.get(firestoreId);
  if (isValidCoverUrl(fromSession)) return fromSession;
  return getCachedCoverUrl(firestoreId);
}

export function isSessionCoverReady(firestoreId: string): boolean {
  return sessionResolved.has(firestoreId);
}

export function setSessionCoverUrl(firestoreId: string, url: string): void {
  if (!firestoreId || !isValidCoverUrl(url)) return;
  sessionResolved.set(firestoreId, url);
  sessionLoading.delete(firestoreId);
  rememberCoverUrl(firestoreId, url);
}

export function clearSessionCoverUrl(firestoreId: string, failedUrl?: string): void {
  if (!firestoreId) return;
  const current = sessionResolved.get(firestoreId);
  if (!failedUrl || current === failedUrl) {
    sessionResolved.delete(firestoreId);
  }
  sessionLoading.delete(firestoreId);
  forgetCoverUrl(firestoreId, failedUrl);
}

/** Pré-carrega e registra capa na sessão */
export function warmSessionCover(firestoreId: string, url: string): void {
  if (!firestoreId || !isValidCoverUrl(url) || sessionResolved.has(firestoreId) || sessionLoading.has(firestoreId)) {
    return;
  }
  sessionLoading.add(firestoreId);
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => setSessionCoverUrl(firestoreId, url);
  img.onerror = () => sessionLoading.delete(firestoreId);
  img.src = url;
  if (img.complete && img.naturalWidth > 0) {
    setSessionCoverUrl(firestoreId, url);
  }
}

export function warmSessionCovers(items: { firestoreId: string; url: string }[]): void {
  for (const { firestoreId, url } of items) {
    warmSessionCover(firestoreId, url);
  }
}
