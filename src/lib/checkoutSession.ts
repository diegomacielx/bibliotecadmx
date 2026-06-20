import { auth } from './firebase';

export type CheckoutSessionResult =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; code: string; message: string };

/** Exibe CTA de compra in-app quando configurado na Vercel (flag pública). */
export function isInAppPaymentsEnabled(): boolean {
  return import.meta.env.VITE_PAYMENTS_ENABLED === 'true';
}

/**
 * Inicia Stripe Checkout — cartão é coletado apenas pela página Stripe (PCI-safe).
 */
export async function startCheckoutSession(options?: {
  priceId?: string;
  mode?: 'payment' | 'subscription';
}): Promise<CheckoutSessionResult> {
  const user = auth.currentUser;
  if (!user) {
    return { ok: false, code: 'not_authenticated', message: 'Faça login para continuar.' };
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    return { ok: false, code: 'auth_token', message: 'Sessão expirada. Faça login novamente.' };
  }

  let res: Response;
  try {
    res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(options ?? {}),
    });
  } catch {
    return { ok: false, code: 'network', message: 'Falha de conexão. Tente novamente.' };
  }

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    url?: string;
    sessionId?: string;
    code?: string;
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      code: data.code ?? 'request_failed',
      message: data.message ?? data.error ?? 'Não foi possível iniciar o pagamento.',
    };
  }

  if (data.ok && data.url && data.sessionId) {
    return { ok: true, url: data.url, sessionId: data.sessionId };
  }

  return { ok: false, code: 'invalid_response', message: 'Resposta inválida do servidor.' };
}
