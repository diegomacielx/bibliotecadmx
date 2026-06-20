import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdminAuth } from '../server/lib/firebaseAdmin.js';

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) return null;
  return email;
}

/** Consulta existência do e-mail e provedores de login (Admin SDK). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expectedToken = process.env.EMAIL_API_TOKEN;
  if (expectedToken && req.headers['x-email-token'] !== expectedToken) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  let body: { email?: unknown };
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as { email?: unknown });
  } catch {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }

  const email = normalizeEmail(body?.email);
  if (!email) {
    res.status(400).json({ error: 'Informe um e-mail válido.' });
    return;
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    const userRecord = await adminAuth.getUserByEmail(email);
    const providers = userRecord.providerData.map((p) => p.providerId).filter(Boolean);
    res.status(200).json({ exists: true, providers });
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
    if (code === 'auth/user-not-found') {
      res.status(200).json({ exists: false, providers: [] as string[] });
      return;
    }
    console.error('[auth-lookup] unexpected error:', err);
    res.status(500).json({ error: 'Não foi possível verificar o e-mail.' });
  }
}
