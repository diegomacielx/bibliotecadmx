import type { ReactNode } from 'react';
import type { AppSettings } from '../types';
import {
  buildKiwifyWebhookUrl,
  buildStripeWebhookUrl,
  resolveFirebaseProjectId,
  resolveFunctionsRegion,
} from '../lib/paymentWebhooks';
import { Icon } from './Icon';

interface AccessIntegrationsSectionProps {
  appSettings: AppSettings;
  setAppSettings: (s: AppSettings) => void;
  onSave: (e: React.FormEvent) => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const copy = () => {
    void navigator.clipboard.writeText(value);
  };

  return (
    <div className="access-copy-field">
      <label className="admin-label">{label}</label>
      <div className="access-copy-row">
        <code className="access-copy-code">{value}</code>
        <button type="button" className="admin-btn admin-btn--ghost admin-btn--sm shrink-0" onClick={copy}>
          <Icon name="copy" className="w-3.5 h-3.5" />
          Copiar
        </button>
      </div>
    </div>
  );
}

export function AccessIntegrationsSection({
  appSettings,
  setAppSettings,
  onSave,
}: AccessIntegrationsSectionProps) {
  const projectId = resolveFirebaseProjectId();
  const region = resolveFunctionsRegion(appSettings.functionsRegion);
  const kiwifyUrl = buildKiwifyWebhookUrl(projectId, region);
  const stripeUrl = buildStripeWebhookUrl(projectId, region);

  const access = appSettings.access || {};

  return (
    <form onSubmit={onSave} className="admin-panel-section admin-access-form">
      <div className="admin-access-block">
        <h3 className="admin-access-title">Acesso pago (Kiwify / Stripe)</h3>
        <p className="admin-lead">
          Quando alguém compra, o webhook autoriza o e-mail automaticamente. No cadastro ou login,
          o mesmo e-mail da compra entra sem aprovação manual.
        </p>

        <AdminFieldInline label="Região Cloud Functions">
          <input
            className="admin-input"
            placeholder="us-central1"
            value={appSettings.functionsRegion || ''}
            onChange={(e) => setAppSettings({ ...appSettings, functionsRegion: e.target.value })}
          />
        </AdminFieldInline>

        <CopyField
          label="URL webhook Kiwify (Apps → Webhooks → compra aprovada / reembolso)"
          value={kiwifyUrl}
        />
        <CopyField label="URL webhook Stripe (Developers → Webhooks)" value={stripeUrl} />

        <div className="admin-access-steps">
          <p className="admin-hint">
            <strong>Deploy seguro (uma vez):</strong> no terminal, dentro da pasta do projeto:
          </p>
          <ol className="admin-access-list">
            <li>
              <code>firebase functions:secrets:set PAYMENT_WEBHOOK_SECRET</code> — gere uma senha longa
              (32+ caracteres) e use o mesmo valor no lugar de <code>SEU_SEGREDO</code> na URL acima.
            </li>
            <li>
              Opcional Kiwify: <code>firebase functions:secrets:set KIWIFY_DASHBOARD_TOKEN</code> com o
              token exibido ao criar o webhook na Kiwify.
            </li>
            <li>
              Opcional Stripe: <code>firebase functions:secrets:set STRIPE_SECRET_KEY</code> e{' '}
              <code>STRIPE_WEBHOOK_SECRET</code>.
            </li>
            <li>
              <code>firebase deploy --only functions,firestore:rules</code>
            </li>
          </ol>
        </div>

        <AdminFieldInline label="IDs produto Kiwify (opcional, vírgula — vazio = todos)">
          <input
            className="admin-input admin-input--mono"
            placeholder="uuid-produto-1, uuid-produto-2"
            value={(access.kiwifyProductIds || []).join(', ')}
            onChange={(e) =>
              setAppSettings({
                ...appSettings,
                access: {
                  ...access,
                  kiwifyProductIds: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </AdminFieldInline>

        <AdminFieldInline label="IDs price Stripe (opcional, vírgula — vazio = todos)">
          <input
            className="admin-input admin-input--mono"
            placeholder="price_xxx, price_yyy"
            value={(access.stripePriceIds || []).join(', ')}
            onChange={(e) =>
              setAppSettings({
                ...appSettings,
                access: {
                  ...access,
                  stripePriceIds: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </AdminFieldInline>
      </div>

      <div className="admin-access-block">
        <h3 className="admin-access-title">E-mail outbound (Zapier / Make)</h3>
        <p className="admin-lead">
          Disparos quando você libera exercício novo ou responde pedido de aluno — não confundir com
          webhooks de pagamento acima.
        </p>
        <AdminFieldInline label="URL Zapier / Make">
          <input
            type="url"
            placeholder="https://hooks.zapier.com/hooks/catch/..."
            className="admin-input admin-input--mono w-full"
            value={appSettings.webhookUrl || ''}
            onChange={(e) => setAppSettings({ ...appSettings, webhookUrl: e.target.value })}
          />
        </AdminFieldInline>
      </div>

      <button type="submit" className="admin-btn admin-btn--accent w-full sm:w-auto">
        <Icon name="save" className="w-4 h-4" />
        Salvar integrações
      </button>
    </form>
  );
}

function AdminFieldInline({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="admin-field admin-field--full">
      <label className="admin-label">{label}</label>
      {children}
    </div>
  );
}
