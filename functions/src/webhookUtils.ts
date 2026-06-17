import { timingSafeEqual } from 'crypto';

/** Comparação segura contra timing attacks */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyWebhookKey(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}

export function getQueryParam(
  query: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const raw = query?.[key];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return undefined;
}

function dig(obj: unknown, keys: string[]): unknown {
  let cur: unknown = obj;
  for (const key of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export function extractEmail(payload: Record<string, unknown>): string | null {
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

export function extractOrderId(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    payload.order_id,
    payload.orderId,
    payload.order_ref,
    payload.id,
    dig(payload, ['order', 'id']),
    dig(payload, ['Order', 'id']),
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

export function extractProductId(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    dig(payload, ['Product', 'product_id']),
    dig(payload, ['Product', 'id']),
    dig(payload, ['product', 'product_id']),
    dig(payload, ['product', 'id']),
    payload.product_id,
    payload.productId,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

export function extractProductName(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    dig(payload, ['Product', 'product_name']),
    dig(payload, ['Product', 'name']),
    dig(payload, ['product', 'product_name']),
    dig(payload, ['product', 'name']),
    payload.product_name,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return undefined;
}

export function extractCustomerName(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    dig(payload, ['Customer', 'full_name']),
    dig(payload, ['Customer', 'name']),
    dig(payload, ['customer', 'full_name']),
    dig(payload, ['customer', 'name']),
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
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

export function resolveKiwifyEventType(payload: Record<string, unknown>): string {
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

export function isKiwifyGrantEvent(eventType: string): boolean {
  const norm = eventType.toLowerCase();
  if (KIWIFY_GRANT_EVENTS.has(norm)) return true;
  if (norm.includes('aprovad') || norm.includes('approved') || norm.includes('renew')) {
    return true;
  }
  return false;
}

export function isKiwifyRevokeEvent(eventType: string): boolean {
  const norm = eventType.toLowerCase();
  if (KIWIFY_REVOKE_EVENTS.has(norm)) return true;
  if (
    norm.includes('reembols') ||
    norm.includes('refund') ||
    norm.includes('chargeback') ||
    norm.includes('cancel')
  ) {
    return true;
  }
  return false;
}

export function buildKiwifyEventKey(
  orderId: string | undefined,
  eventType: string,
  email: string
): string {
  const base = orderId || email;
  return `kiwify_${base}_${eventType}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 500);
}
