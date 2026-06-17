import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import {
  claimPaymentEvent,
  grantEmailAccess,
  loadIntegrationSettings,
  revokeEmailAccess,
  isProductAllowed,
} from './access';
import {
  buildKiwifyEventKey,
  extractCustomerName,
  extractEmail,
  extractOrderId,
  extractProductId,
  extractProductName,
  getQueryParam,
  isKiwifyGrantEvent,
  isKiwifyRevokeEvent,
  resolveKiwifyEventType,
  verifyWebhookKey,
} from './webhookUtils';

const paymentWebhookSecret = defineSecret('PAYMENT_WEBHOOK_SECRET');
const kiwifyDashboardToken = defineSecret('KIWIFY_DASHBOARD_TOKEN');

/**
 * Webhook Kiwify — configure no painel Kiwify:
 * URL: https://REGION-PROJECT.cloudfunctions.net/kiwifyWebhook?key=SEU_SEGREDO
 *
 * Segurança:
 * - `key` na query deve coincidir com PAYMENT_WEBHOOK_SECRET (Secret Manager)
 * - Se a Kiwify enviar `token` no JSON, validamos contra KIWIFY_DASHBOARD_TOKEN (opcional)
 * - Idempotência por order_id + evento
 */
export const kiwifyWebhook = onRequest(
  {
    secrets: [paymentWebhookSecret, kiwifyDashboardToken],
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

    let payload: Record<string, unknown>;
    try {
      payload =
        typeof req.body === 'object' && req.body !== null
          ? (req.body as Record<string, unknown>)
          : JSON.parse(String(req.rawBody || req.body || '{}'));
    } catch {
      res.status(400).send('Invalid JSON');
      return;
    }

    const dashboardToken = kiwifyDashboardToken.value();
    if (dashboardToken) {
      const bodyToken =
        typeof payload.token === 'string'
          ? payload.token
          : typeof payload.webhook_token === 'string'
            ? payload.webhook_token
            : undefined;
      if (bodyToken && !verifyWebhookKey(bodyToken, dashboardToken)) {
        res.status(401).send('Invalid token');
        return;
      }
    }

    const email = extractEmail(payload);
    if (!email) {
      res.status(422).send('Customer email not found in payload');
      return;
    }

    const eventType = resolveKiwifyEventType(payload);
    const orderId = extractOrderId(payload);
    const productId = extractProductId(payload);
    const settings = await loadIntegrationSettings();

    if (!isProductAllowed(productId, settings.kiwifyProductIds)) {
      res.status(200).send('Ignored — product not in allowlist');
      return;
    }

    const eventKey = buildKiwifyEventKey(orderId, eventType, email);
    const isNew = await claimPaymentEvent(eventKey);
    if (!isNew) {
      res.status(200).send('Already processed');
      return;
    }

    try {
      if (isKiwifyGrantEvent(eventType)) {
        await grantEmailAccess({
          email,
          source: 'kiwify',
          eventType,
          orderId,
          productId,
          productName: extractProductName(payload),
          customerName: extractCustomerName(payload),
        });
        res.status(200).send('Access granted');
        return;
      }

      if (isKiwifyRevokeEvent(eventType)) {
        await revokeEmailAccess({
          email,
          source: 'kiwify',
          eventType,
          orderId,
        });
        res.status(200).send('Access revoked');
        return;
      }

      res.status(200).send(`Ignored event: ${eventType}`);
    } catch (err) {
      console.error('kiwifyWebhook error', err);
      res.status(500).send('Internal error');
    }
  }
);
