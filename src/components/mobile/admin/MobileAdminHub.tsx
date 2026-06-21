import type { AdminFilter } from '../../../types';
import { Icon } from '../../Icon';

interface MobileAdminHubProps {
  stats: { total: number; completed: number; pending: number; cloudMissing: number };
  adminFilter: AdminFilter;
  onFilterChange: (filter: AdminFilter) => void;
  onNewExercise: () => void;
  onToggleUserPreview?: () => void;
  adminUserPreview?: boolean;
  bannerDismissed: boolean;
  onDismissBanner: () => void;
  toolbar: React.ReactNode;
  children: React.ReactNode;
}

const FILTER_OPTIONS: { value: AdminFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'YouTube OK' },
  { value: 'incomplete', label: 'Sem vídeo' },
  { value: 'missing_cloud', label: 'Cloud ?' },
  { value: 'missing_cover', label: 'Capa ?' },
];

export function MobileAdminHub({
  stats,
  adminFilter,
  onFilterChange,
  onNewExercise,
  onToggleUserPreview,
  adminUserPreview = false,
  bannerDismissed,
  onDismissBanner,
  toolbar,
  children,
}: MobileAdminHubProps) {
  return (
    <div className="mobile-admin-hub">
      {!bannerDismissed && (
        <div className="mobile-admin-banner mb-fluid-sm" role="status">
          <div className="mobile-admin-banner__icon" aria-hidden="true">
            <Icon name="dashboard" className="w-4 h-4" />
          </div>
          <div className="mobile-admin-banner__body">
            <p className="mobile-admin-banner__title">Gestão completa no desktop</p>
            <p className="mobile-admin-banner__text">
              No celular: catálogo, alunos, pedidos e edição rápida. Lote, campanhas e auditoria —
              melhor no computador.
            </p>
          </div>
          <button
            type="button"
            className="mobile-admin-banner__dismiss"
            onClick={onDismissBanner}
            aria-label="Fechar aviso"
          >
            <Icon name="x" className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="mobile-admin-metrics">
        <div className="mobile-admin-metric">
          <span className="mobile-admin-metric__value">{stats.total}</span>
          <span className="mobile-admin-metric__label">Total</span>
        </div>
        <div className="mobile-admin-metric">
          <span className="mobile-admin-metric__value mobile-admin-metric__value--ok">{stats.completed}</span>
          <span className="mobile-admin-metric__label">YouTube</span>
        </div>
        <div className="mobile-admin-metric">
          <span className={`mobile-admin-metric__value ${stats.pending > 0 ? 'mobile-admin-metric__value--warn' : ''}`}>
            {stats.pending}
          </span>
          <span className="mobile-admin-metric__label">Pendentes</span>
        </div>
        <div className="mobile-admin-metric">
          <span className={`mobile-admin-metric__value ${stats.cloudMissing > 0 ? 'mobile-admin-metric__value--info' : ''}`}>
            {stats.cloudMissing}
          </span>
          <span className="mobile-admin-metric__label">Cloud</span>
        </div>
      </div>

      <div className="mobile-admin-quick-actions">
        <button type="button" className="mobile-admin-quick-btn mobile-admin-quick-btn--primary" onClick={onNewExercise}>
          <Icon name="plus" className="w-4 h-4" />
          Novo
        </button>
        {onToggleUserPreview && (
          <button
            type="button"
            className={`mobile-admin-quick-btn ${adminUserPreview ? 'mobile-admin-quick-btn--active' : ''}`}
            onClick={onToggleUserPreview}
          >
            <Icon name="eye" className="w-4 h-4" />
            {adminUserPreview ? 'Visão ativa' : 'Visão aluno'}
          </button>
        )}
      </div>

      <div className="mobile-admin-filter-scroll no-scrollbar" role="tablist" aria-label="Filtros do catálogo admin">
        {FILTER_OPTIONS.map((opt) => {
          const active = adminFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={`mobile-admin-filter-pill ${active ? 'mobile-admin-filter-pill--active' : ''}`}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {toolbar}
      {children}
    </div>
  );
}
