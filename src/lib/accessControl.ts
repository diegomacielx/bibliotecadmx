import { fbDoc, db, getDoc, updateDoc } from './firebase';
import { getAuthorizedPath, getUserProfilePath } from './utils';
import type { AuthorizedEmail, UserProfile } from '../types';
import type { User } from './firebase';

function normalizeEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

export function isAuthorizedEmailActive(record: AuthorizedEmail | undefined | null): boolean {
  if (!record) return false;
  if (record.accessStatus === 'revoked') return false;
  return true;
}

/** Verifica se o e-mail tem compra/autorização ativa no Firestore */
export async function fetchAuthorizedEmail(email: string): Promise<AuthorizedEmail | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const snap = await getDoc(fbDoc(db, ...getAuthorizedPath(), normalized));
  if (!snap.exists()) return null;
  return snap.data() as AuthorizedEmail;
}

/**
 * Sincroniza acesso após login/cadastro:
 * - Comprador Kiwify/Stripe com e-mail autorizado → approved
 * - Revogado → permanece blocked/pending
 */
export async function syncUserAccess(
  user: User,
  profile: UserProfile
): Promise<UserProfile> {
  if (profile.status === 'blocked') return profile;

  const email = normalizeEmail(user.email);
  if (!email) return profile;

  const authorized = await fetchAuthorizedEmail(email);
  if (!isAuthorizedEmailActive(authorized)) {
    return profile;
  }

  if (profile.status === 'approved') return profile;

  const now = new Date().toISOString();
  await updateDoc(fbDoc(db, ...getUserProfilePath(user.uid)), {
    status: 'approved',
    accessSyncedAt: now,
  });

  return { ...profile, status: 'approved' };
}

/** Status inicial ao criar perfil (cadastro ou migração) */
export async function resolveInitialUserStatus(email: string): Promise<'approved' | 'pending'> {
  const authorized = await fetchAuthorizedEmail(email);
  return isAuthorizedEmailActive(authorized) ? 'approved' : 'pending';
}
