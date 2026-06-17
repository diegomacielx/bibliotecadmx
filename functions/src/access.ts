import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

export const db = getFirestore();

/** Deve coincidir com VITE_APP_ID no frontend */
export const APP_ID = process.env.DMX_APP_ID || 'dmx-exercicios-cloud';

export const paths = {
  authorizedEmail: (email: string) =>
    `artifacts/${APP_ID}/public/data/authorized_emails/${email}`,
  appUsers: () => `artifacts/${APP_ID}/public/data/app_users`,
  paymentEvents: () => `artifacts/${APP_ID}/public/data/payment_events`,
  settingsIntegrations: () =>
    `artifacts/${APP_ID}/public/data/settings/integrations`,
};

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes('@')) return null;
  return email;
}

export type AccessStatus = 'active' | 'revoked';

export interface AuthorizedEmailRecord {
  email: string;
  source: string;
  accessStatus: AccessStatus;
  authorizedAt: string;
  orderId?: string;
  productId?: string;
  productName?: string;
  customerName?: string;
  lastEvent?: string;
  lastWebhookAt?: string;
  expiresAt?: string | null;
}

export interface IntegrationSettings {
  kiwifyProductIds?: string[];
  stripePriceIds?: string[];
}

export async function loadIntegrationSettings(): Promise<IntegrationSettings> {
  const snap = await db.doc(paths.settingsIntegrations()).get();
  if (!snap.exists) return {};
  const data = snap.data() as { access?: IntegrationSettings };
  return data.access || {};
}

export function isProductAllowed(
  productId: string | undefined,
  allowlist: string[] | undefined
): boolean {
  if (!allowlist?.length) return true;
  if (!productId) return false;
  return allowlist.includes(productId);
}

export async function grantEmailAccess(input: {
  email: string;
  source: string;
  eventType: string;
  orderId?: string;
  productId?: string;
  productName?: string;
  customerName?: string;
  expiresAt?: string | null;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('invalid_email');
  }

  const now = new Date().toISOString();
  const authRef = db.doc(paths.authorizedEmail(email));

  const record: AuthorizedEmailRecord = {
    email,
    source: input.source,
    accessStatus: 'active',
    authorizedAt: now,
    orderId: input.orderId,
    productId: input.productId,
    productName: input.productName,
    customerName: input.customerName,
    lastEvent: input.eventType,
    lastWebhookAt: now,
    expiresAt: input.expiresAt ?? null,
  };

  const batch = db.batch();
  batch.set(authRef, record, { merge: true });

  const usersSnap = await db
    .collection(paths.appUsers())
    .where('email', '==', email)
    .get();

  usersSnap.forEach((doc) => {
    batch.update(doc.ref, { status: 'approved', accessSyncedAt: now });
  });

  await batch.commit();
}

export async function revokeEmailAccess(input: {
  email: string;
  source: string;
  eventType: string;
  orderId?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('invalid_email');
  }

  const now = new Date().toISOString();
  const authRef = db.doc(paths.authorizedEmail(email));

  const batch = db.batch();
  batch.set(
    authRef,
    {
      email,
      source: input.source,
      accessStatus: 'revoked',
      lastEvent: input.eventType,
      lastWebhookAt: now,
      revokedAt: now,
      orderId: input.orderId,
    },
    { merge: true }
  );

  const usersSnap = await db
    .collection(paths.appUsers())
    .where('email', '==', email)
    .get();

  usersSnap.forEach((doc) => {
    batch.update(doc.ref, { status: 'blocked', accessSyncedAt: now });
  });

  await batch.commit();
}

/** Evita processar o mesmo evento duas vezes (retries da Kiwify/Stripe) */
export async function claimPaymentEvent(eventKey: string): Promise<boolean> {
  const ref = db.collection(paths.paymentEvents()).doc(eventKey);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return false;
    tx.set(ref, {
      processedAt: new Date().toISOString(),
    });
    return true;
  });
}
