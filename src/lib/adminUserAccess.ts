import { auth } from './firebase';
import type { UserProfile } from '../types';

async function adminAccessRequest(body: {
  action: 'set_status' | 'remove';
  uid: string;
  status?: UserProfile['status'];
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login como administrador.');

  const token = await user.getIdToken();
  const res = await fetch('/api/admin-user-access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Falha ao atualizar acesso.');
  }
}

export async function adminSetUserStatus(
  uid: string,
  status: UserProfile['status']
): Promise<void> {
  await adminAccessRequest({ action: 'set_status', uid, status });
}

export async function adminRemoveUserProfile(uid: string): Promise<void> {
  await adminAccessRequest({ action: 'remove', uid });
}
