/**
 * Cliente para /api/auth-email — e-mails de autenticação via Resend + Firebase Admin.
 * Substitui os templates padrão do Firebase por emails branded da Biblioteca DMX.
 */

export type AuthEmailAction = 'password_reset' | 'email_verification';

interface AuthEmailInput {
  action: AuthEmailAction;
  email: string;
  displayName?: string;
}

const EMAIL_API_TOKEN = import.meta.env.VITE_EMAIL_API_TOKEN as string | undefined;

function getAppUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export interface AuthEmailResult {
  ok: boolean;
  message?: string;
  error?: string;
}

export async function sendAuthEmail(input: AuthEmailInput): Promise<AuthEmailResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (EMAIL_API_TOKEN) headers['x-email-token'] = EMAIL_API_TOKEN;

    const res = await fetch('/api/auth-email', {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...input, appUrl: getAppUrl() }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    if (!res.ok) {
      if (res.status >= 500 && !data.error) {
        return {
          ok: false,
          error: 'Serviço de e-mail indisponível no momento. Tente novamente em alguns minutos.',
        };
      }
      return { ok: false, error: data.error || 'Não foi possível enviar o e-mail.' };
    }
    return { ok: true, message: data.message };
  } catch {
    return { ok: false, error: 'Sem conexão. Verifique a internet e tente novamente.' };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthEmailResult> {
  return sendAuthEmail({ action: 'password_reset', email });
}

/** Ex.: diego.maciel.965@gmail.com → d••••@gmail.com */
export function maskEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0) return normalized;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const head = local.slice(0, 1);
  const maskLen = Math.min(4, Math.max(1, local.length - 1));
  return `${head}${'•'.repeat(maskLen)}@${domain}`;
}

export async function requestEmailVerification(email: string, displayName?: string): Promise<AuthEmailResult> {
  return sendAuthEmail({ action: 'email_verification', email, displayName });
}
