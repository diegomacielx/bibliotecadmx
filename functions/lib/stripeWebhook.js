"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const stripe_1 = __importDefault(require("stripe"));
const access_1 = require("./access");
const webhookUtils_1 = require("./webhookUtils");
const stripeSecretKey = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
const stripeWebhookSecret = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
const paymentWebhookSecret = (0, params_1.defineSecret)('PAYMENT_WEBHOOK_SECRET');
function extractStripeEmail(session) {
    return ((0, access_1.normalizeEmail)(session.customer_details?.email) ||
        (0, access_1.normalizeEmail)(session.customer_email) ||
        (0, access_1.normalizeEmail)(session.metadata?.email));
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
exports.stripeWebhook = (0, https_1.onRequest)({
    secrets: [stripeSecretKey, stripeWebhookSecret, paymentWebhookSecret],
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
    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') {
        res.status(400).send('Missing stripe-signature');
        return;
    }
    const stripe = new stripe_1.default(stripeSecretKey.value());
    let event;
    try {
        const rawBody = req.rawBody;
        if (!rawBody) {
            res.status(400).send('Missing body');
            return;
        }
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret.value());
    }
    catch (err) {
        console.error('Stripe signature verification failed', err);
        res.status(400).send('Invalid signature');
        return;
    }
    const eventKey = `stripe_${event.id}`;
    const isNew = await (0, access_1.claimPaymentEvent)(eventKey);
    if (!isNew) {
        res.status(200).send('Already processed');
        return;
    }
    const settings = await (0, access_1.loadIntegrationSettings)();
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const email = extractStripeEmail(session);
                if (!email) {
                    res.status(422).send('Email not found');
                    return;
                }
                const priceId = session.metadata?.price_id ||
                    (typeof session.metadata?.stripe_price_id === 'string'
                        ? session.metadata.stripe_price_id
                        : undefined);
                if (!(0, access_1.isProductAllowed)(priceId, settings.stripePriceIds)) {
                    res.status(200).send('Ignored — price not in allowlist');
                    return;
                }
                await (0, access_1.grantEmailAccess)({
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
                const sub = event.data.object;
                const email = (0, access_1.normalizeEmail)(sub.metadata?.email) ||
                    (typeof sub.customer === 'object' &&
                        sub.customer !== null &&
                        !('deleted' in sub.customer && sub.customer.deleted)
                        ? (0, access_1.normalizeEmail)(sub.customer.email)
                        : null);
                if (!email) {
                    res.status(422).send('Email not found');
                    return;
                }
                await (0, access_1.revokeEmailAccess)({
                    email,
                    source: 'stripe',
                    eventType: event.type,
                    orderId: sub.id,
                });
                res.status(200).send('Access revoked');
                return;
            }
            case 'charge.refunded': {
                const charge = event.data.object;
                const email = (0, access_1.normalizeEmail)(charge.billing_details?.email);
                if (!email) {
                    res.status(200).send('Ignored — no email on charge');
                    return;
                }
                await (0, access_1.revokeEmailAccess)({
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
    }
    catch (err) {
        console.error('stripeWebhook error', err);
        res.status(500).send('Internal error');
    }
});
//# sourceMappingURL=stripeWebhook.js.map