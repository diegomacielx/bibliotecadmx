/**
 * Cliente para a função serverless /api/send-email (Resend).
 * Disparo "fire-and-forget": nunca derruba o fluxo do app se o email falhar.
 */

type EmailType = 'request_fulfilled' | 'new_exercise' | 'generic';

interface SendEmailInput {
  type: EmailType;
  to: string | string[];
  data?: Record<string, string>;
}

const EMAIL_API_TOKEN = import.meta.env.VITE_EMAIL_API_TOKEN as string | undefined;

function getAppUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (EMAIL_API_TOKEN) headers['x-email-token'] = EMAIL_API_TOKEN;

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...input,
        data: { appUrl: getAppUrl(), ...(input.data ?? {}) },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
