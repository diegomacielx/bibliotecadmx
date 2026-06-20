import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseAuthHeader } from './lib/verifyFirebaseAuth.js';

/** Corpo esperado quando o checkout in-app for ativado. */
interface CheckoutSessionPayload {
  /** ID do price Stripe (ex.: price_xxx) */
  priceId?: string;
  /** payment = compra única; subscription = recorrência */
  mode?: 'payment' | 'subscription';
}

const NOT_READY_BODY = {
  ok: false as const,
  code: 'payments_not_enabled' as const,
  message: 'Os pagamentos diretos no app ainda não estão disponíveis.',
};

/**
 * Cria uma sessão Stripe Checkout para usuário autenticado.
 *
 * Segurança:
 * - Exige Firebase ID token (Bearer) — nunca confia no e-mail do body
 * - STRIPE_SECRET_KEY só no servidor (Vercel env, sem prefixo VITE_)
 * - Cartão nunca passa por esta rota (Stripe Elements / Checkout)
 *
 * Stub: retorna 503 até PAYMENTS_ENABLED=true e STRIPE_SECRET_KEY configurados.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const authResult = await verifyFirebaseAuthHeader(req.headers.authorization);
  if ('error' in authResult) {
    res.status(authResult.status).json({ error: authResult.error });
    return;
  }

  const { user } = authResult;

  if (!user.email) {
    res.status(403).json({ error: 'Conta sem e-mail associado. Não é possível iniciar pagamento.' });
    return;
  }

  let body: CheckoutSessionPayload = {};
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as CheckoutSessionPayload);
    } catch {
      res.status(400).json({ error: 'JSON inválido.' });
      return;
    }
  }

  if (body.mode !== undefined && body.mode !== 'payment' && body.mode !== 'subscription') {
    res.status(400).json({ error: 'O campo mode deve ser "payment" ou "subscription".' });
    return;
  }

  if (typeof body.priceId === 'string' && body.priceId.trim() && !body.priceId.startsWith('price_')) {
    res.status(400).json({ error: 'priceId inválido.' });
    return;
  }

  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!paymentsEnabled || !stripeSecretKey) {
    res.status(503).json(NOT_READY_BODY);
    return;
  }

  // ── Próxima etapa (Stripe): criar Checkout Session aqui ──
  // const stripe = new Stripe(stripeSecretKey, { apiVersion: '...' });
  // const session = await stripe.checkout.sessions.create({
  //   mode: body.mode ?? 'payment',
  //   line_items: [{ price: body.priceId, quantity: 1 }],
  //   customer_email: user.email,
  //   client_reference_id: user.uid,
  //   metadata: { firebaseUid: user.uid },
  //   success_url: `${appUrl}/conta?checkout=success`,
  //   cancel_url: `${appUrl}/conta?checkout=cancel`,
  // });
  // res.status(200).json({ ok: true, url: session.url, sessionId: session.id });

  res.status(503).json(NOT_READY_BODY);
}
