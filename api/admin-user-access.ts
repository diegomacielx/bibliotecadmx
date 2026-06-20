import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdminApp, getFirebaseAdminAuth } from '../server/lib/firebaseAdmin.js';
import { userProfileDocPath } from '../server/lib/firestorePaths.js';
import { verifyAdminRequest } from '../server/lib/verifyAdmin.js';

type UserStatus = 'approved' | 'pending' | 'blocked';

type Body = {
  action?: 'set_status' | 'remove';
  uid?: string;
  status?: UserStatus;
};

function parseBody(req: VercelRequest): Body {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Body);
  } catch {
    return {};
  }
}

/** Admin: altera status ou remove perfil + revoga tokens para efeito imediato no cliente. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminCheck = await verifyAdminRequest(req);
  if ('error' in adminCheck) {
    res.status(adminCheck.status).json({ error: adminCheck.error });
    return;
  }

  const body = parseBody(req);
  const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
  if (!uid) {
    res.status(400).json({ error: 'Informe o uid do usuário.' });
    return;
  }

  getFirebaseAdminApp();
  const db = getFirestore();
  const profileRef = db.doc(userProfileDocPath(uid));
  const adminAuth = getFirebaseAdminAuth();

  try {
    if (body.action === 'set_status') {
      const status = body.status;
      if (status !== 'approved' && status !== 'pending' && status !== 'blocked') {
        res.status(400).json({ error: 'Status inválido.' });
        return;
      }

      const snap = await profileRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Perfil não encontrado.' });
        return;
      }

      await profileRef.update({
        status,
        ...(status === 'approved' ? { accessSyncedAt: new Date().toISOString() } : {}),
      });

      if (status === 'blocked') {
        await adminAuth.revokeRefreshTokens(uid);
      }

      res.status(200).json({ ok: true, action: 'set_status', uid, status });
      return;
    }

    if (body.action === 'remove') {
      const snap = await profileRef.get();
      if (!snap.exists) {
        res.status(404).json({ error: 'Perfil não encontrado.' });
        return;
      }

      await profileRef.delete();
      await adminAuth.revokeRefreshTokens(uid);

      res.status(200).json({ ok: true, action: 'remove', uid });
      return;
    }

    res.status(400).json({ error: 'Ação inválida. Use set_status ou remove.' });
  } catch (err) {
    console.error('[admin-user-access]', err);
    res.status(500).json({ error: 'Falha ao atualizar acesso do usuário.' });
  }
}
