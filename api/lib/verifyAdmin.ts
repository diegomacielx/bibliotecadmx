import type { VercelRequest } from '@vercel/node';
import { verifyFirebaseAuthHeader } from './verifyFirebaseAuth.js';
import { isAdminEmail } from './adminEmails.js';

export type VerifiedAdmin = {
  uid: string;
  email: string;
};

type AdminFailure = {
  error: string;
  status: 401 | 403;
};

export async function verifyAdminRequest(
  req: VercelRequest
): Promise<{ admin: VerifiedAdmin } | AdminFailure> {
  const auth = await verifyFirebaseAuthHeader(req.headers.authorization);
  if ('error' in auth) {
    return { error: auth.error, status: 401 };
  }

  const email = auth.user.email?.trim().toLowerCase();
  if (!isAdminEmail(email)) {
    return { error: 'Acesso restrito a administradores.', status: 403 };
  }

  return { admin: { uid: auth.user.uid, email: email! } };
}
