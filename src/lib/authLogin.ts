const EMAIL_API_TOKEN = import.meta.env.VITE_EMAIL_API_TOKEN as string | undefined;

export interface AuthEmailLookup {
  exists: boolean;
  providers: string[];
  uid?: string;
}

export type AuthMethodKind =
  | 'unknown'
  | 'not_registered'
  | 'password_only'
  | 'google_only'
  | 'password_and_google';

export function resolveAuthMethodKind(lookup: AuthEmailLookup | null): AuthMethodKind {
  if (!lookup) return 'unknown';
  if (!lookup.exists) return 'not_registered';
  const hasPassword = lookup.providers.includes('password');
  const hasGoogle = lookup.providers.includes('google.com');
  if (hasPassword && hasGoogle) return 'password_and_google';
  if (hasGoogle) return 'google_only';
  if (hasPassword) return 'password_only';
  return 'unknown';
}

export async function lookupAuthEmail(email: string): Promise<AuthEmailLookup | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (EMAIL_API_TOKEN) headers['x-email-token'] = EMAIL_API_TOKEN;

    const res = await fetch('/api/auth-lookup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as AuthEmailLookup;
    if (typeof data.exists !== 'boolean' || !Array.isArray(data.providers)) return null;
    return data;
  } catch {
    return null;
  }
}

export function getNotRegisteredMessage(): string {
  return 'Este e-mail ainda não está cadastrado. Toque em "Cadastre-se" para criar sua conta.';
}

export function getEmailPasswordLoginMessage(lookup: AuthEmailLookup | null): string {
  if (!lookup) return 'E-mail ou senha incorretos.';
  if (!lookup.exists) {
    return getNotRegisteredMessage();
  }
  switch (resolveAuthMethodKind(lookup)) {
    case 'google_only':
      return 'Esta conta foi criada com Google. A senha do Gmail não funciona aqui — use "Continuar com Google" ou "Criar senha de acesso" abaixo.';
    case 'password_and_google':
      return 'E-mail ou senha incorretos. Você também pode entrar com "Continuar com Google".';
    default:
      return 'E-mail ou senha incorretos.';
  }
}

export function getRegisterBlockedMessage(lookup: AuthEmailLookup | null): string | null {
  if (!lookup?.exists) return null;
  switch (resolveAuthMethodKind(lookup)) {
    case 'google_only':
      return 'Este e-mail já está cadastrado com Google. Entre com Google ou crie uma senha de acesso em "Criar senha de acesso".';
    case 'password_only':
    case 'password_and_google':
      return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.';
    default:
      return 'Este e-mail já está cadastrado. Faça login.';
  }
}

export function isLoginCredentialError(code: string | undefined): boolean {
  return (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-login-credentials'
  );
}
