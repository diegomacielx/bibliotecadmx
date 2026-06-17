/** Normaliza e valida apelido (nickname) */
export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function validateNickname(raw: string): string | null {
  const nick = normalizeNickname(raw);
  if (nick.length < 2) return 'O apelido deve ter pelo menos 2 caracteres.';
  if (nick.length > 24) return 'O apelido pode ter no máximo 24 caracteres.';
  if (!/^[\p{L}\p{N}._ -]+$/u.test(nick)) {
    return 'Use apenas letras, números, espaços, ponto, hífen ou underscore.';
  }
  return null;
}

export function resolveDisplayNickname(input: {
  nickname?: string | null;
  name?: string | null;
  email?: string | null;
}): string {
  const nick = normalizeNickname(input.nickname || '');
  if (nick) return nick;

  const name = normalizeNickname(input.name || '');
  if (name) return name.split(' ')[0] || name;

  const email = input.email?.split('@')[0]?.trim();
  return email || 'Aluno';
}
