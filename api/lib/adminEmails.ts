/** Deve coincidir com ADMIN_EMAILS em src/lib/constants.ts e firestore.rules */
export const ADMIN_EMAILS = ['diego.maciel.965@gmail.com', 'contatomacielx@gmail.com'];

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
