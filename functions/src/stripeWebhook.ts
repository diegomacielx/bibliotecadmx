import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import Stripe from 'stripe';
import {
  claimPaymentEvent,
  grantEmailAccess,
  loadIntegrationSettings,
  revokeEmailAccess,
  isProductAllowed,
  normalizeEmail,
} from './access';
import { verifyWebhookKey, getQueryParam } from './webhookUtils';

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const paymentWebhookSecret = defineSecret('PAYMENT_WEBHOOK_SECRET');

function extractStripeEmail(session: Stripe.Checkout.Session): string | null {
  return (
    normalizeEmail(session.customer_details?.email) ||
    normalizeEmail(session.customer_email) ||
    normalizeEmail(session.metadata?.email)
  );
}

/**
 * Webhook Stripe — configure em Developers → Webhooks:
 * URL: https://REGION-PROJECT.cloudfunctions.net/stripeWebhook?key=SEU_SEGREDO
 *
 * Eventos recomendados:
 * - checkout.session.completed
 * - customer.subscription.deleted
 * - charge.refunded
 */
export const stripeWebhook = onRequest(
  {
    secrets: [stripeSecretKey, stripeWebhookSecret, paymentWebhookSecret],
    cors: false,
    invoker: 'public',
    maxInstances: 10,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const providedKey = getQueryParam(req.query as Record<string, unknown>, 'key');
    if (!verifyWebhookKey(providedKey, paymentWebhookSecret.value())) {
      res.status(401).send('Unauthorized');
      return;
    }

    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      res.status(400).send('Missing stripe-signature');
      return;
    }

    const stripe = new Stripe(stripeSecretKey.value());
    let event: Stripe.Event;

    try {
      const rawBody = req.rawBody;
      if (!rawBody) {
        res.status(400).send('Missing body');
        return;
      }
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      console.error('Stripe signature verification failed', err);
      res.status(400).send('Invalid signature');
      return;
    }

    const eventKey = `stripe_${event.id}`;
    const isNew = await claimPaymentEvent(eventKey);
    if (!isNew) {
      res.status(200).send('Already processed');
      return;
    }

    const settings = await loadIntegrationSettings();

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const email = extractStripeEmail(session);
          if (!email) {
            res.status(422).send('Email not found');
            return;
          }

          const priceId =
            session.metadata?.price_id ||
            (typeof session.metadata?.stripe_price_id === 'string'
              ? session.metadata.stripe_price_id
              : undefined);

          if (!isProductAllowed(priceId, settings.stripePriceIds)) {
            res.status(200).send('Ignored — price not in allowlist');
            return;
          }

          await grantEmailAccess({
            email,
            source: 'stripe',
            eventType: event.type,
            orderId: session.id,
            productId: priceId,
            productName: session.metadata?.product_name,
            customerName: session.customer_details?.name || undefined,
          });
          res.status(200).send('Access granted');
          return;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          const email =
            normalizeEmail(sub.metadata?.email) ||
            (typeof sub.customer === 'object' &&
            sub.customer !== null &&
            !('deleted' in sub.customer && sub.customer.deleted)
              ? normalizeEmail((sub.customer as Stripe.Customer).email)
              : null);
          if (!email) {
            res.status(422).send('Email not found');
            return;
          }
          await revokeEmailAccess({
            email,
            source: 'stripe',
            eventType: event.type,
            orderId: sub.id,
          });
          res.status(200).send('Access revoked');
          return;
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          const email = normalizeEmail(charge.billing_details?.email);
          if (!email) {
            res.status(200).send('Ignored — no email on charge');
            return;
          }
          await revokeEmailAccess({
            email,
            source: 'stripe',
            eventType: event.type,
            orderId: charge.id,
          });
          res.status(200).send('Access revoked');
          return;
        }

        default:
          res.status(200).send(`Ignored: ${event.type}`);
      }
    } catch (err) {
      console.error('stripeWebhook error', err);
      res.status(500).send('Internal error');
    }
  }
);
