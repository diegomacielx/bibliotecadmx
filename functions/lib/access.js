"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paths = exports.APP_ID = exports.db = void 0;
exports.normalizeEmail = normalizeEmail;
exports.loadIntegrationSettings = loadIntegrationSettings;
exports.isProductAllowed = isProductAllowed;
exports.grantEmailAccess = grantEmailAccess;
exports.revokeEmailAccess = revokeEmailAccess;
exports.claimPaymentEvent = claimPaymentEvent;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
(0, app_1.initializeApp)();
exports.db = (0, firestore_1.getFirestore)();
/** Deve coincidir com VITE_APP_ID no frontend */
exports.APP_ID = process.env.DMX_APP_ID || 'dmx-exercicios-cloud';
exports.paths = {
    authorizedEmail: (email) => `artifacts/${exports.APP_ID}/public/data/authorized_emails/${email}`,
    appUsers: () => `artifacts/${exports.APP_ID}/public/data/app_users`,
    paymentEvents: () => `artifacts/${exports.APP_ID}/public/data/payment_events`,
    settingsIntegrations: () => `artifacts/${exports.APP_ID}/public/data/settings/integrations`,
};
function normalizeEmail(raw) {
    if (typeof raw !== 'string')
        return null;
    const email = raw.trim().toLowerCase();
    if (!email || !email.includes('@'))
        return null;
    return email;
}
async function loadIntegrationSettings() {
    const snap = await exports.db.doc(exports.paths.settingsIntegrations()).get();
    if (!snap.exists)
        return {};
    const data = snap.data();
    return data.access || {};
}
function isProductAllowed(productId, allowlist) {
    if (!allowlist?.length)
        return true;
    if (!productId)
        return false;
    return allowlist.includes(productId);
}
async function grantEmailAccess(input) {
    const email = normalizeEmail(input.email);
    if (!email) {
        throw new Error('invalid_email');
    }
    const now = new Date().toISOString();
    const authRef = exports.db.doc(exports.paths.authorizedEmail(email));
    const record = {
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
    const batch = exports.db.batch();
    batch.set(authRef, record, { merge: true });
    const usersSnap = await exports.db
        .collection(exports.paths.appUsers())
        .where('email', '==', email)
        .get();
    usersSnap.forEach((doc) => {
        batch.update(doc.ref, { status: 'approved', accessSyncedAt: now });
    });
    await batch.commit();
}
async function revokeEmailAccess(input) {
    const email = normalizeEmail(input.email);
    if (!email) {
        throw new Error('invalid_email');
    }
    const now = new Date().toISOString();
    const authRef = exports.db.doc(exports.paths.authorizedEmail(email));
    const batch = exports.db.batch();
    batch.set(authRef, {
        email,
        source: input.source,
        accessStatus: 'revoked',
        lastEvent: input.eventType,
        lastWebhookAt: now,
        revokedAt: now,
        orderId: input.orderId,
    }, { merge: true });
    const usersSnap = await exports.db
        .collection(exports.paths.appUsers())
        .where('email', '==', email)
        .get();
    usersSnap.forEach((doc) => {
        batch.update(doc.ref, { status: 'blocked', accessSyncedAt: now });
    });
    await batch.commit();
}
/** Evita processar o mesmo evento duas vezes (retries da Kiwify/Stripe) */
async function claimPaymentEvent(eventKey) {
    const ref = exports.db.collection(exports.paths.paymentEvents()).doc(eventKey);
    return exports.db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists)
            return false;
        tx.set(ref, {
            processedAt: new Date().toISOString(),
        });
        return true;
    });
}
//# sourceMappingURL=access.js.map