"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kiwifyWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const access_1 = require("./access");
const webhookUtils_1 = require("./webhookUtils");
const paymentWebhookSecret = (0, params_1.defineSecret)('PAYMENT_WEBHOOK_SECRET');
const kiwifyDashboardToken = (0, params_1.defineSecret)('KIWIFY_DASHBOARD_TOKEN');
/**
 * Webhook Kiwify — configure no painel Kiwify:
 * URL: https://REGION-PROJECT.cloudfunctions.net/kiwifyWebhook?key=SEU_SEGREDO
 *
 * Segurança:
 * - `key` na query deve coincidir com PAYMENT_WEBHOOK_SECRET (Secret Manager)
 * - Se a Kiwify enviar `token` no JSON, validamos contra KIWIFY_DASHBOARD_TOKEN (opcional)
 * - Idempotência por order_id + evento
 */
exports.kiwifyWebhook = (0, https_1.onRequest)({
    secrets: [paymentWebhookSecret, kiwifyDashboardToken],
    cors: false,
    invoker: 'public',
    maxInstances: 10,
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const providedKey = (0, webhookUtils_1.getQueryParam)(req.query, 'key');
    if (!(0, webhookUtils_1.verifyWebhookKey)(providedKey, paymentWebhookSecret.value())) {
        res.status(401).send('Unauthorized');
        return;
    }
    let payload;
    try {
        payload =
            typeof req.body === 'object' && req.body !== null
                ? req.body
                : JSON.parse(String(req.rawBody || req.body || '{}'));
    }
    catch {
        res.status(400).send('Invalid JSON');
        return;
    }
    const dashboardToken = kiwifyDashboardToken.value();
    if (dashboardToken) {
        const bodyToken = typeof payload.token === 'string'
            ? payload.token
            : typeof payload.webhook_token === 'string'
                ? payload.webhook_token
                : undefined;
        if (bodyToken && !(0, webhookUtils_1.verifyWebhookKey)(bodyToken, dashboardToken)) {
            res.status(401).send('Invalid token');
            return;
        }
    }
    const email = (0, webhookUtils_1.extractEmail)(payload);
    if (!email) {
        res.status(422).send('Customer email not found in payload');
        return;
    }
    const eventType = (0, webhookUtils_1.resolveKiwifyEventType)(payload);
    const orderId = (0, webhookUtils_1.extractOrderId)(payload);
    const productId = (0, webhookUtils_1.extractProductId)(payload);
    const settings = await (0, access_1.loadIntegrationSettings)();
    if (!(0, access_1.isProductAllowed)(productId, settings.kiwifyProductIds)) {
        res.status(200).send('Ignored — product not in allowlist');
        return;
    }
    const eventKey = (0, webhookUtils_1.buildKiwifyEventKey)(orderId, eventType, email);
    const isNew = await (0, access_1.claimPaymentEvent)(eventKey);
    if (!isNew) {
        res.status(200).send('Already processed');
        return;
    }
    try {
        if ((0, webhookUtils_1.isKiwifyGrantEvent)(eventType)) {
            await (0, access_1.grantEmailAccess)({
                email,
                source: 'kiwify',
                eventType,
                orderId,
                productId,
                productName: (0, webhookUtils_1.extractProductName)(payload),
                customerName: (0, webhookUtils_1.extractCustomerName)(payload),
            });
            res.status(200).send('Access granted');
            return;
        }
        if ((0, webhookUtils_1.isKiwifyRevokeEvent)(eventType)) {
            await (0, access_1.revokeEmailAccess)({
                email,
                source: 'kiwify',
                eventType,
                orderId,
            });
            res.status(200).send('Access revoked');
            return;
        }
        res.status(200).send(`Ignored event: ${eventType}`);
    }
    catch (err) {
        console.error('kiwifyWebhook error', err);
        res.status(500).send('Internal error');
    }
});
//# sourceMappingURL=kiwifyWebhook.js.map