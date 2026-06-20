import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAdminAuth } from './firebaseAdmin.js';

export type VerifiedFirebaseUser = {
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
  token: DecodedIdToken;
};

type AuthFailure = {
  error: string;
  status: 401;
};

/**
 * Valida `Authorization: Bearer <Firebase ID token>` via Admin SDK.
 * Use em rotas server-side que exigem usuário autenticado (ex.: checkout).
 */
export async function verifyFirebaseAuthHeader(
  authorization: string | string[] | undefined
): Promise<{ user: VerifiedFirebaseUser } | AuthFailure> {
  const header = Array.isArray(authorization) ? authorization[0] : authorization;
  if (!header?.startsWith('Bearer ')) {
    return { error: 'Token de autenticação ausente.', status: 401 };
  }

  const idToken = header.slice('Bearer '.length).trim();
  if (!idToken) {
    return { error: 'Token de autenticação inválido.', status: 401 };
  }

  try {
    const token = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
    return {
      user: {
        uid: token.uid,
        email: token.email,
        emailVerified: token.email_verified ?? false,
        token,
      },
    };
  } catch {
    return { error: 'Sessão expirada ou inválida. Faça login novamente.', status: 401 };
  }
}
