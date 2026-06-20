import Stripe from 'stripe';

let stripeSingleton: Stripe | undefined;

export function getStripeClient(secretKey: string): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey);
  }
  return stripeSingleton;
}

export type CheckoutMode = 'payment' | 'subscription';

export function resolveCheckoutMode(
  bodyMode: CheckoutMode | undefined,
  envMode: string | undefined
): CheckoutMode {
  if (bodyMode === 'payment' || bodyMode === 'subscription') return bodyMode;
  return envMode?.trim() === 'subscription' ? 'subscription' : 'payment';
}
