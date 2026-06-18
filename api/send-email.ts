import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

/**
 * Disparo de emails transacionais via Resend.
 *
 * Variáveis de ambiente (configurar na Vercel):
 * - RESEND_API_KEY  (obrigatória) — chave da conta Resend
 * - EMAIL_FROM      (opcional)    — remetente. Padrão: "Biblioteca DMX <onboarding@resend.dev>"
 *                                   Sem domínio verificado no Resend, só é possível enviar para
 *                                   o email da própria conta. Verifique um domínio para enviar a alunos.
 * - EMAIL_API_TOKEN (opcional)    — se definida, exige o header "x-email-token" igual no request.
 *                                   No front, exponha o mesmo valor como VITE_EMAIL_API_TOKEN.
 */

type EmailType = 'request_fulfilled' | 'new_exercise' | 'generic';

interface EmailPayload {
  type: EmailType;
  to: string | string[];
  data?: Record<string, string>;
}

const BRAND = {
  name: 'Biblioteca DMX',
  accent: '#ef4444',
  bg: '#0c0c10',
  card: '#16161c',
  text: '#f5f5f6',
  muted: '#a1a1aa',
};

function layout(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string): string {
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
          Você recebeu este email porque tem acesso à ${BRAND.name}.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildEmail(payload: EmailPayload): { subject: string; html: string } {
  const d = payload.data ?? {};
  const appUrl = d.appUrl || '';

  switch (payload.type) {
    case 'request_fulfilled':
      return {
        subject: `Seu pedido foi gravado: ${d.exerciseName ?? 'novo exercício'} 🎉`,
        html: layout(
          'Seu pedido foi gravado! 🎉',
          `<tr><td style="padding-bottom:14px;">Olá${d.studentName ? `, <strong style="color:${BRAND.text};">${d.studentName}</strong>` : ''}! O exercício <strong style="color:${BRAND.text};">"${d.exerciseName ?? ''}"</strong> que você sugeriu acabou de chegar na biblioteca.</td></tr>
           <tr><td style="padding-bottom:18px;">Já está disponível em alta definição para você assistir e baixar.</td></tr>`,
          appUrl ? 'Assistir agora' : undefined,
          appUrl || undefined
        ),
      };

    case 'new_exercise':
      return {
        subject: `Novo exercício liberado: ${d.exerciseName ?? ''}`,
        html: layout(
          'Novo exercício liberado',
          `<tr><td style="padding-bottom:14px;"><strong style="color:${BRAND.text};">"${d.exerciseName ?? ''}"</strong>${d.category ? ` (${d.category})` : ''} já está disponível na biblioteca.</td></tr>`,
          appUrl ? 'Ver na biblioteca' : undefined,
          appUrl || undefined
        ),
      };

    default:
      return {
        subject: d.subject || `${BRAND.name}`,
        html: layout(d.title || BRAND.name, `<tr><td>${d.message ?? ''}</td></tr>`, d.ctaLabel, d.ctaUrl),
      };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'RESEND_API_KEY não configurada na Vercel.' });
    return;
  }

  const expectedToken = process.env.EMAIL_API_TOKEN;
  if (expectedToken && req.headers['x-email-token'] !== expectedToken) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  let payload: EmailPayload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as EmailPayload);
  } catch {
    res.status(400).json({ error: 'JSON inválido.' });
    return;
  }

  const recipients = (Array.isArray(payload?.to) ? payload.to : [payload?.to]).filter(
    (e): e is string => !!e && /.+@.+\..+/.test(e)
  );
  if (!payload?.type || recipients.length === 0) {
    res.status(400).json({ error: 'Campos obrigatórios: type e to (email válido).' });
    return;
  }

  const from = process.env.EMAIL_FROM || 'Biblioteca DMX <onboarding@resend.dev>';
  const { subject, html } = buildEmail(payload);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({ from, to: recipients, subject, html });
    if (error) {
      res.status(502).json({ error: error.message || 'Falha no envio.' });
      return;
    }
    res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro inesperado.' });
  }
}
