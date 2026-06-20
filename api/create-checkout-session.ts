import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseAuthHeader } from './lib/verifyFirebaseAuth.js';
import { resolveAppUrl } from './lib/resolveAppUrl.js';
import { getStripeClient, resolveCheckoutMode, type CheckoutMode } from './lib/stripeClient.js';

interface CheckoutSessionPayload {
  priceId?: string;
  mode?: CheckoutMode;
}

const NOT_READY_BODY = {
  ok: false as const,
  code: 'payments_not_enabled' as const,
  message: 'Os pagamentos diretos no app ainda não estão disponíveis.',
};

function isValidPriceId(value: string | undefined): value is string {
  return Boolean(value?.startsWith('price_'));
}

/**
 * Cria sessão Stripe Checkout para usuário autenticado.
 * Cartão nunca passa por esta rota — Stripe hospeda o formulário (PCI).
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

  const paymentsEnabled = process.env.PAYMENTS_ENABLED === 'true';
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!paymentsEnabled || !stripeSecretKey) {
    res.status(503).json(NOT_READY_BODY);
    return;
  }

  const priceId = body.priceId?.trim() || process.env.STRIPE_DEFAULT_PRICE_ID?.trim();
  if (!isValidPriceId(priceId)) {
    res.status(400).json({
      error: 'Produto não configurado. Defina STRIPE_DEFAULT_PRICE_ID na Vercel ou envie priceId.',
    });
    return;
  }

  if (body.priceId?.trim() && !isValidPriceId(body.priceId.trim())) {
    res.status(400).json({ error: 'priceId inválido.' });
    return;
  }

  const mode = resolveCheckoutMode(body.mode, process.env.STRIPE_CHECKOUT_MODE);
  const appUrl = resolveAppUrl(req);
  const stripe = getStripeClient(stripeSecretKey);

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.uid,
      metadata: {
        firebase_uid: user.uid,
        email: user.email,
        price_id: priceId,
        stripe_price_id: priceId,
      },
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) {
      console.error('[create-checkout-session] Stripe session without url', session.id);
      res.status(502).json({ error: 'Stripe não retornou URL de checkout.' });
      return;
    }

    res.status(200).json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('[create-checkout-session] Stripe error:', err);
    res.status(502).json({ error: 'Não foi possível criar a sessão de pagamento.' });
  }
}
