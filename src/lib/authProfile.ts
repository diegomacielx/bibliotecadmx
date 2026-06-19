import { fbDoc, db, getDoc, setDoc } from './firebase';
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
  const profileRef = fbDoc(db, ...getUserProfilePath(user.uid));
  const existing = await getDoc(profileRef);

  if (existing.exists()) {
    return existing.data() as UserProfile;
  }

  const authRef = fbDoc(db, ...getAuthorizedPath(), email);
  const authSnap = await getDoc(authRef);
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

  await setDoc(profileRef, profile);
  return profile;
}
