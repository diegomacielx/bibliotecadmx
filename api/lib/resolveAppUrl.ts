import type { VercelRequest } from '@vercel/node';

const DEFAULT_APP_URL = 'https://bibliotecadmx.vercel.app';

/** URL pública do app para redirects Stripe (success/cancel). */
export function resolveAppUrl(req: VercelRequest): string {
  const fromEnv = process.env.APP_URL?.trim().replace(/\/$/, '');
  if (fromEnv && /^https:\/\//i.test(fromEnv)) return fromEnv;

  const origin = req.headers.origin;
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');

  const referer = req.headers.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.origin;
      }
    } catch {
      /* ignore */
    }
  }

  return DEFAULT_APP_URL;
}
