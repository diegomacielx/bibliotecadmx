export const BRAND = {
  name: 'Biblioteca DMX',
  accent: '#ef4444',
  bg: '#0c0c10',
  card: '#16161c',
  text: '#f5f5f6',
  muted: '#a1a1aa',
};

export function emailLayout(
  title: string,
  bodyHtml: string,
  ctaLabel?: string,
  ctaUrl?: string
): string {
  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:8px 0 4px;">
           <a href="${ctaUrl}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:9999px;">${ctaLabel}</a>
         </td></tr>`
      : '';
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${BRAND.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${BRAND.card};border:1px solid #26262e;border-radius:18px;overflow:hidden;">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #26262e;">
          <span style="font-size:18px;font-weight:800;letter-spacing:0.02em;color:${BRAND.text};">BIBLIOTECA <span style="color:${BRAND.accent};">DMX</span></span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:${BRAND.text};">${title}</h1>
          <table role="presentation" cellpadding="0" cellspacing="0" style="color:${BRAND.muted};font-size:15px;line-height:1.6;">
            ${bodyHtml}
            ${cta}
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #26262e;color:#52525b;font-size:12px;">
          Você recebeu este email porque tem (ou solicitou) acesso à ${BRAND.name}.
          Se não reconhece esta ação, ignore esta mensagem.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function buildPasswordResetEmail(resetUrl: string, userName?: string): { subject: string; html: string } {
  const greeting = userName
    ? `Olá, <strong style="color:${BRAND.text};">${userName}</strong>!`
    : 'Olá!';
  return {
    subject: 'Redefinir sua senha — Biblioteca DMX',
    html: emailLayout(
      'Redefinição de senha',
      `<tr><td style="padding-bottom:14px;">${greeting} Recebemos um pedido para redefinir a senha da sua conta na Biblioteca DMX.</td></tr>
       <tr><td style="padding-bottom:14px;">Clique no botão abaixo para criar uma nova senha. O link expira em 1 hora por segurança.</td></tr>
       <tr><td style="padding-bottom:8px;font-size:13px;">Se você não solicitou esta alteração, pode ignorar este email — sua senha atual continua válida.</td></tr>`,
      'Redefinir senha',
      resetUrl
    ),
  };
}

export function buildEmailVerificationEmail(verifyUrl: string, userName?: string): { subject: string; html: string } {
  const greeting = userName
    ? `Olá, <strong style="color:${BRAND.text};">${userName}</strong>!`
    : 'Olá!';
  return {
    subject: 'Confirme seu e-mail — Biblioteca DMX',
    html: emailLayout(
      'Verificação de e-mail',
      `<tr><td style="padding-bottom:14px;">${greeting} Bem-vindo(a) à Biblioteca DMX.</td></tr>
       <tr><td style="padding-bottom:14px;">Confirme seu endereço de e-mail para proteger sua conta e receber avisos importantes sobre novos exercícios.</td></tr>`,
      'Confirmar e-mail',
      verifyUrl
    ),
  };
}
