import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';
import { getFirebaseAdminAuth } from './lib/firebaseAdmin';
import { buildEmailVerificationEmail, buildPasswordResetEmail } from './lib/emailLayout';

type AuthEmailAction = 'password_reset' | 'email_verification';

interface AuthEmailPayload {
  action: AuthEmailAction;
  email: string;
  displayName?: string;
  appUrl?: string;
}

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) return null;
  return email;
}

function getAppUrl(payload: AuthEmailPayload, req: VercelRequest): string {
  const fromBody = payload.appUrl?.replace(/\/$/, '');
  if (fromBody && /^https?:\/\//.test(fromBody)) return fromBody;
  const origin = req.headers.origin;
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, '');
  return 'https://bibliotecadmx.vercel.app';
}

/** Resposta genérica — não revela se o e-mail existe (segurança). */
const OK_RESPONSE = {
  ok: true,
  message: 'Se o e-mail estiver cadastrado, enviamos as instruções. Verifique a caixa de entrada e o spam.',
};

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

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    res.status(500).json({ error: 'RESEND_API_KEY não configurada na Vercel.' });
    return;
  }

  let payload: AuthEmailPayload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as AuthEmailPayload);
  } catch {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }

  const email = normalizeEmail(payload?.email);
  if (!email || !payload?.action) {
    res.status(400).json({ error: 'Campos obrigatórios: action e email.' });
    return;
  }

  const appUrl = getAppUrl(payload, req);
  const from = process.env.EMAIL_FROM || 'Biblioteca DMX <onboarding@resend.dev>';

  try {
    const adminAuth = getFirebaseAdminAuth();
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      // Não revelar que o usuário não existe
      res.status(200).json(OK_RESPONSE);
      return;
    }

    const actionCodeSettings = {
      url: appUrl,
      handleCodeInApp: true,
    };

    const displayName = payload.displayName || userRecord.displayName || undefined;

    if (payload.action === 'password_reset') {
      const link = await adminAuth.generatePasswordResetLink(email, actionCodeSettings);
      const { subject, html } = buildPasswordResetEmail(link, displayName);
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({ from, to: email, subject, html });
      if (error) {
        console.error('[auth-email] password_reset send failed:', error);
        res.status(502).json({ error: 'Falha ao enviar e-mail. Tente novamente em alguns minutos.' });
        return;
      }
    } else if (payload.action === 'email_verification') {
      if (userRecord.emailVerified) {
        res.status(200).json({ ok: true, message: 'Este e-mail já está verificado.' });
        return;
      }
      const link = await adminAuth.generateEmailVerificationLink(email, actionCodeSettings);
      const { subject, html } = buildEmailVerificationEmail(link, displayName);
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({ from, to: email, subject, html });
      if (error) {
        console.error('[auth-email] email_verification send failed:', error);
        res.status(502).json({ error: 'Falha ao enviar e-mail. Tente novamente em alguns minutos.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Ação inválida.' });
      return;
    }

    res.status(200).json(OK_RESPONSE);
  } catch (err) {
    console.error('[auth-email] unexpected error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Erro inesperado ao processar solicitação.',
    });
  }
}
