export const APP_ID = process.env.DMX_APP_ID || process.env.VITE_APP_ID || 'dmx-exercicios-cloud';

export function userProfileDocPath(uid: string): string {
  return `artifacts/${APP_ID}/public/data/app_users/${uid}`;
}
