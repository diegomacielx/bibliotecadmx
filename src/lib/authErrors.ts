/** Mensagens amigáveis para erros do Firebase Auth */
export function getAuthErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail inválido. Verifique o endereço digitado.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada. Entre em contato com o suporte.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet. Tente novamente.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado. Faça login.';
    case 'auth/weak-password':
      return 'Senha fraca. Use pelo menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'Cadastro temporariamente indisponível.';
    default:
      return fallback;
  }
}

export function getAuthErrorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    return String((err as { code?: string }).code);
  }
  return undefined;
}
