import type { AdminTab } from '../../../types';
import { Icon } from '../../Icon';

interface MobileAdminDesktopGateProps {
  tab: AdminTab;
  onBack: () => void;
  onContinue: () => void;
}

const TAB_LABELS: Record<AdminTab, string> = {
  batch: 'Importação em lote',
  authorized: 'Autorizar e-mails',
  audit: 'Auditoria Cloud',
  settings: 'Integrações e destaque',
  single: 'Cadastro',
  requests: 'Pedidos',
  users: 'Alunos',
};

export function MobileAdminDesktopGate({ tab, onBack, onContinue }: MobileAdminDesktopGateProps) {
  return (
    <div className="mobile-admin-desktop-gate">
      <div className="mobile-admin-desktop-gate__icon" aria-hidden="true">
        <Icon name="dashboard" className="w-8 h-8" />
      </div>
      <h3 className="mobile-admin-desktop-gate__title">{TAB_LABELS[tab]}</h3>
      <p className="mobile-admin-desktop-gate__text">
        Esta área funciona no celular, mas foi pensada para telas largas — formulários longos,
        campanhas e importação em lote são mais confortáveis no desktop.
      </p>
      <div className="mobile-admin-desktop-gate__actions">
        <button type="button" className="mobile-admin-desktop-gate__btn mobile-admin-desktop-gate__btn--ghost" onClick={onBack}>
          Voltar
        </button>
        <button type="button" className="mobile-admin-desktop-gate__btn mobile-admin-desktop-gate__btn--primary" onClick={onContinue}>
          Continuar no celular
        </button>
      </div>
    </div>
  );
}
