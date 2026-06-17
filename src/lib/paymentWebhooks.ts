/** URLs dos webhooks de pagamento (Cloud Functions) */
export function buildKiwifyWebhookUrl(
  projectId: string,
  region: string,
  secretPlaceholder = 'SEU_SEGREDO'
): string {
  return `https://${region}-${projectId}.cloudfunctions.net/kiwifyWebhook?key=${secretPlaceholder}`;
}

export function buildStripeWebhookUrl(
  projectId: string,
  region: string,
  secretPlaceholder = 'SEU_SEGREDO'
): string {
  return `https://${region}-${projectId}.cloudfunctions.net/stripeWebhook?key=${secretPlaceholder}`;
}

export const DEFAULT_FUNCTIONS_REGION = 'us-central1';

export function resolveFunctionsRegion(settingsRegion?: string): string {
  return settingsRegion?.trim() || import.meta.env.VITE_FUNCTIONS_REGION || DEFAULT_FUNCTIONS_REGION;
}

export function resolveFirebaseProjectId(): string {
  return import.meta.env.VITE_FIREBASE_PROJECT_ID || 'biblioteca-dmx';
}
