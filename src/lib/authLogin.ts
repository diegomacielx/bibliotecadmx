const EMAIL_API_TOKEN = import.meta.env.VITE_EMAIL_API_TOKEN as string | undefined;

export interface AuthEmailLookup {
  exists: boolean;
  providers: string[];
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

export function getEmailPasswordLoginMessage(lookup: AuthEmailLookup | null): string {
  if (!lookup) return 'E-mail ou senha incorretos.';
  if (!lookup.exists) {
    return 'Este e-mail não está cadastrado. Crie uma conta para continuar.';
  }
  const hasPassword = lookup.providers.includes('password');
  const hasGoogle = lookup.providers.includes('google.com');
  if (hasGoogle && !hasPassword) {
    return 'Esta conta usa Google. Clique em "Continuar com Google" ou use "Esqueci minha senha" para definir uma senha.';
  }
  return 'E-mail ou senha incorretos.';
}

export function isLoginCredentialError(code: string | undefined): boolean {
  return (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-login-credentials'
  );
}
