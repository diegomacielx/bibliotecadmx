import { GoogleAuthProvider, linkWithCredential, type AuthCredential } from 'firebase/auth';
import type { User } from './firebase';

const PENDING_LINK_KEY = 'dmx_google_link_pending';

export type GoogleLinkMode = 'credential' | 'retry-popup';

export interface GoogleLinkPending {
  email: string;
  mode: GoogleLinkMode;
  idToken?: string;
  accessToken?: string;
}

export interface ParsedGoogleLinkError {
  email: string;
  credential: AuthCredential | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseGoogleLinkError(err: unknown): ParsedGoogleLinkError | null {
  if (!isRecord(err) || err.code !== 'auth/account-exists-with-different-credential') return null;

  const customData = isRecord(err.customData) ? err.customData : null;
  const email = typeof customData?.email === 'string' ? customData.email.trim().toLowerCase() : '';
  if (!email) return null;

  const credential = GoogleAuthProvider.credentialFromError(err as never);
  return { email, credential };
}

export function savePendingGoogleLink(pending: GoogleLinkPending): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_LINK_KEY, JSON.stringify(pending));
}

export function loadPendingGoogleLink(): GoogleLinkPending | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_LINK_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as GoogleLinkPending;
    if (typeof data.email !== 'string' || !data.email.trim()) return null;
    if (data.mode !== 'credential' && data.mode !== 'retry-popup') return null;
    return { ...data, email: data.email.trim().toLowerCase() };
  } catch {
    return null;
  }
}

export function clearPendingGoogleLink(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PENDING_LINK_KEY);
}

export function pendingCredentialFromStorage(pending: GoogleLinkPending): AuthCredential | null {
  if (pending.mode !== 'credential' || !pending.idToken) return null;
  return GoogleAuthProvider.credential(pending.idToken, pending.accessToken);
}

export function persistCredentialPending(email: string, credential: AuthCredential | null): void {
  if (!credential) {
    savePendingGoogleLink({ email, mode: 'retry-popup' });
    return;
  }
  const oauth = credential as AuthCredential & { idToken?: string; accessToken?: string };
  savePendingGoogleLink({
    email,
    mode: 'credential',
    idToken: oauth.idToken,
    accessToken: oauth.accessToken,
  });
}

export async function linkGoogleCredentialToUser(user: User, pending: GoogleLinkPending): Promise<void> {
  if (pending.mode === 'retry-popup') {
    throw new Error('retry-popup');
  }
  const credential = pendingCredentialFromStorage(pending);
  if (!credential) throw new Error('missing-credential');
  await linkWithCredential(user, credential);
}

export function userHasPasswordProvider(user: User): boolean {
  return user.providerData.some((p) => p.providerId === 'password');
}
