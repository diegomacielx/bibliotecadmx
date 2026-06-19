import { runTransaction } from 'firebase/firestore';
import { fbDoc, db, getDoc } from './firebase';
import type { User } from './firebase';
import { getAuthorizedPath, getUserProfilePath } from './utils';
import { isAuthorizedEmailActive } from './accessControl';
import { normalizeNickname } from './nickname';
import type { AuthorizedEmail, UserProfile } from '../types';

export async function ensureUserProfile(
  user: User,
  options?: { name?: string; nickname?: string }
): Promise<UserProfile> {
  const email = (user.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Conta Google sem e-mail associado.');
  }

  const profileRef = fbDoc(db, ...getUserProfilePath(user.uid));
  const authRef = fbDoc(db, ...getAuthorizedPath(), email);

  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(profileRef);
    if (existing.exists()) {
      return existing.data() as UserProfile;
    }

    const authSnap = await transaction.get(authRef);
    const isPreAuthorized =
      authSnap.exists() && isAuthorizedEmailActive(authSnap.data() as AuthorizedEmail);
    const finalStatus = isPreAuthorized ? 'approved' : 'pending';

    const fallbackName = options?.name || user.displayName || email.split('@')[0] || 'Usuário';
    const fallbackNickname =
      options?.nickname ||
      normalizeNickname(user.displayName?.split(/\s+/)[0] || email.split('@')[0] || 'aluno');

    const profile: UserProfile = {
      uid: user.uid,
      email,
      name: fallbackName,
      nickname: fallbackNickname,
      status: finalStatus,
      createdAt: new Date().toISOString(),
    };

    transaction.set(profileRef, profile);
    return profile;
  });
}

export async function getUserProfileIfExists(user: User): Promise<UserProfile | null> {
  const profileRef = fbDoc(db, ...getUserProfilePath(user.uid));
  const snap = await getDoc(profileRef);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
