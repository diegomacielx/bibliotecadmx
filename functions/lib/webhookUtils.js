"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeEqual = safeEqual;
exports.verifyWebhookKey = verifyWebhookKey;
exports.getQueryParam = getQueryParam;
exports.extractEmail = extractEmail;
exports.extractOrderId = extractOrderId;
exports.extractProductId = extractProductId;
exports.extractProductName = extractProductName;
exports.extractCustomerName = extractCustomerName;
exports.resolveKiwifyEventType = resolveKiwifyEventType;
exports.isKiwifyGrantEvent = isKiwifyGrantEvent;
exports.isKiwifyRevokeEvent = isKiwifyRevokeEvent;
exports.buildKiwifyEventKey = buildKiwifyEventKey;
const crypto_1 = require("crypto");
/** Comparação segura contra timing attacks */
function safeEqual(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length)
        return false;
    return (0, crypto_1.timingSafeEqual)(bufA, bufB);
}
function verifyWebhookKey(provided, expected) {
    if (!provided || !expected)
        return false;
    return safeEqual(provided, expected);
}
function getQueryParam(query, key) {
    const raw = query?.[key];
    if (typeof raw === 'string')
        return raw;
    if (Array.isArray(raw) && typeof raw[0] === 'string')
        return raw[0];
    return undefined;
}
function dig(obj, keys) {
    let cur = obj;
    for (const key of keys) {
        if (!cur || typeof cur !== 'object')
            return undefined;
        cur = cur[key];
    }
    return cur;
}
function extractEmail(payload) {
    const candidates = [
        dig(payload, ['Customer', 'email']),
        dig(payload, ['Customer', 'Email']),
        dig(payload, ['customer', 'email']),
        dig(payload, ['customer', 'Email']),
        dig(payload, ['buyer', 'email']),
        dig(payload, ['Buyer', 'email']),
        payload.email,
        payload.customer_email,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.includes('@')) {
            return c.trim().toLowerCase();
        }
    }
    return null;
}
function extractOrderId(payload) {
    const candidates = [
        payload.order_id,
        payload.orderId,
        payload.order_ref,
        payload.id,
        dig(payload, ['order', 'id']),
        dig(payload, ['Order', 'id']),
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim())
            return c.trim();
    }
    return undefined;
}
function extractProductId(payload) {
    const candidates = [
        dig(payload, ['Product', 'product_id']),
        dig(payload, ['Product', 'id']),
        dig(payload, ['product', 'product_id']),
        dig(payload, ['product', 'id']),
        payload.product_id,
        payload.productId,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim())
            return c.trim();
    }
    return undefined;
}
function extractProductName(payload) {
    const candidates = [
        dig(payload, ['Product', 'product_name']),
        dig(payload, ['Product', 'name']),
        dig(payload, ['product', 'product_name']),
        dig(payload, ['product', 'name']),
        payload.product_name,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim())
            return c.trim();
    }
    return undefined;
}
function extractCustomerName(payload) {
    const candidates = [
        dig(payload, ['Customer', 'full_name']),
        dig(payload, ['Customer', 'name']),
        dig(payload, ['customer', 'full_name']),
        dig(payload, ['customer', 'name']),
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim())
            return c.trim();
    }
    return undefined;
}
const KIWIFY_GRANT_EVENTS = new Set([
    'compra_aprovada',
    'order_approved',
    'subscription_renewed',
    'assinatura_renovada',
    'paid',
    'approved',
]);
const KIWIFY_REVOKE_EVENTS = new Set([
    'compra_reembolsada',
    'order_refunded',
    'chargeback',
    'subscription_canceled',
    'assinatura_cancelada',
    'subscription_late',
    'refunded',
    'cancelled',
    'canceled',
]);
function resolveKiwifyEventType(payload) {
    const candidates = [
        payload.webhook_event_type,
        payload.WebhookEventType,
        payload.event,
        payload.event_type,
        payload.trigger,
        payload.order_status,
        payload.status,
    ];
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) {
            return c.trim().toLowerCase();
        }
    }
    return 'unknown';
}
function isKiwifyGrantEvent(eventType) {
    const norm = eventType.toLowerCase();
    if (KIWIFY_GRANT_EVENTS.has(norm))
        return true;
    if (norm.includes('aprovad') || norm.includes('approved') || norm.includes('renew')) {
        return true;
    }
    return false;
}
function isKiwifyRevokeEvent(eventType) {
    const norm = eventType.toLowerCase();
    if (KIWIFY_REVOKE_EVENTS.has(norm))
        return true;
    if (norm.includes('reembols') ||
        norm.includes('refund') ||
        norm.includes('chargeback') ||
        norm.includes('cancel')) {
        return true;
    }
    return false;
}
function buildKiwifyEventKey(orderId, eventType, email) {
    const base = orderId || email;
    return `kiwify_${base}_${eventType}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 500);
}
//# sourceMappingURL=webhookUtils.js.map