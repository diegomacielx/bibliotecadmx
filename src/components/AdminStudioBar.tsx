import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdminTab, AdminFilter } from '../types';
import { Icon } from './Icon';

interface AdminStudioBarProps {
  stats: { total: number; completed: number; pending: number; cloudMissing: number };
  adminFilter: AdminFilter;
  onFilterChange: (filter: AdminFilter) => void;
  pendingUsersCount: number;
  pendingRequestsCount: number;
  onOpenTab: (tab: AdminTab) => void;
  onNewExercise: () => void;
  adminUserPreview?: boolean;
  onToggleUserPreview?: () => void;
}

const FILTER_OPTIONS: { value: AdminFilter; label: string; short: string }[] = [
  { value: 'all', label: 'Todos os exercícios', short: 'Todos' },
  { value: 'completed', label: 'Youtube ✅', short: 'Youtube ✅' },
  { value: 'incomplete', label: 'Youtube ❌', short: 'Youtube ❌' },
  { value: 'upados_cloud', label: 'Cloud ✅', short: 'Cloud ✅' },
  { value: 'missing_cloud', label: 'Cloud ❌', short: 'Cloud ❌' },
];

const MANAGE_ITEMS: {
  tab: AdminTab;
  label: string;
  icon: string;
  badge?: number;
  accent?: 'amber' | 'blue';
}[] = [
  { tab: 'users', label: 'Alunos', icon: 'users', badge: 0, accent: 'amber' },
  { tab: 'requests', label: 'Pedidos', icon: 'listtodo', badge: 0, accent: 'blue' },
  { tab: 'authorized', label: 'Autorizar e-mails', icon: 'mail' },
  { tab: 'single', label: 'Cadastro único', icon: 'pluscircle' },
  { tab: 'audit', label: 'Auditoria Cloud', icon: 'cloud' },
  { tab: 'settings', label: 'Configurações', icon: 'settings' },
];

const METRICS = [
  { key: 'total' as const, label: 'Total', tone: 'default' },
  { key: 'completed' as const, label: 'YouTube', tone: 'muted' },
  { key: 'pending' as const, label: 'Pendentes', tone: 'warn' },
  { key: 'cloudMissing' as const, label: 'Cloud', tone: 'info' },
];

export function AdminStudioBar({
  stats,
  adminFilter,
  onFilterChange,
  pendingUsersCount,
  pendingRequestsCount,
  onOpenTab,
  onNewExercise,
  adminUserPreview = false,
  onToggleUserPreview,
}: AdminStudioBarProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const manageRef = useRef<HTMLDivElement>(null);

  const activeFilter = FILTER_OPTIONS.find((o) => o.value === adminFilter) || FILTER_OPTIONS[0];
  const attentionCount = pendingUsersCount + pendingRequestsCount;

  const manageItems = MANAGE_ITEMS.map((item) => ({
    ...item,
    badge:
      item.tab === 'users'
        ? pendingUsersCount
        : item.tab === 'requests'
          ? pendingRequestsCount
          : undefined,
  }));

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilter(false);
      if (manageRef.current && !manageRef.current.contains(e.target as Node)) setShowManage(false);
    };
    document.addEventListener('pointerdown', handleClickOutside, true);
    return () => document.removeEventListener('pointerdown', handleClickOutside, true);
  }, []);

  const metricValueClass = (key: typeof METRICS[number]['key'], tone: string) => {
    if (tone === 'warn' && stats[key] > 0) return 'studio-metric-value--warn';
    if (tone === 'info' && stats[key] > 0) return 'studio-metric-value--info';
    if (tone === 'muted') return 'studio-metric-value--muted';
    return '';
  };

  return (
    <div className="studio-bar cinema-container mb-fluid-md">
      <div className="studio-bar-inner">
        <div className="studio-metrics-grid">
          {METRICS.map(({ key, label, tone }) => (
            <div key={key} className="studio-metric-cell">
              <span className={`studio-metric-value ${metricValueClass(key, tone)}`}>{stats[key]}</span>
              <span className="studio-metric-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="studio-actions">
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => {
                setShowFilter((v) => !v);
                setShowManage(false);
              }}
              className="studio-btn studio-btn--ghost"
              aria-expanded={showFilter}
            >
              <Icon name="filter" className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{activeFilter.short}</span>
              <Icon name="chevrondown" className="w-3.5 h-3.5 shrink-0 studio-btn-icon" />
            </button>
            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+0.4rem)] w-56 dropdown-panel py-1 z-50"
                >
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onFilterChange(opt.value);
                        setShowFilter(false);
                      }}
                      className={`menu-item w-full text-left ${
                        adminFilter === opt.value ? 'menu-item--active' : ''
                      }`}
                    >
                      {opt.label}
                      {adminFilter === opt.value && (
                        <Icon name="check" className="w-3.5 h-3.5 ml-auto text-red-500" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button type="button" onClick={onNewExercise} className="studio-btn studio-btn--primary">
            <Icon name="plus" className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Novo</span>
          </button>

          {onToggleUserPreview && (
            <button
              type="button"
              onClick={onToggleUserPreview}
              className={`studio-btn ${adminUserPreview ? 'studio-btn--primary' : 'studio-btn--ghost'}`}
              title="Ver o site como um aluno"
            >
              <Icon name="eye" className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">
                {adminUserPreview ? 'Visão ativa' : 'Visão usuário'}
              </span>
            </button>
          )}

          <div className="relative" ref={manageRef}>
            <button
              type="button"
              onClick={() => {
                setShowManage((v) => !v);
                setShowFilter(false);
              }}
              className="studio-btn studio-btn--ghost"
              aria-expanded={showManage}
            >
              <Icon name="more" className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Gerenciar</span>
              {attentionCount > 0 && (
                <span className="studio-badge studio-badge--amber">{attentionCount}</span>
              )}
            </button>
            <AnimatePresence>
              {showManage && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+0.4rem)] w-56 dropdown-panel py-1 z-50"
                >
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Studio Admin
                  </p>
                  {manageItems.map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => {
                        onOpenTab(item.tab);
                        setShowManage(false);
                      }}
                      className="menu-item w-full text-left"
                    >
                      <Icon name={item.icon} className="w-4 h-4 studio-btn-icon" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge != null && item.badge > 0 && (
                        <span
                          className={`studio-badge ${
                            item.accent === 'amber' ? 'studio-badge--amber' : 'studio-badge--blue'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
