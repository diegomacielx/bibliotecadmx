import { Icon } from '../../Icon';
import type { MobileAdminTab } from '../../../lib/adminMobile';

interface MobileAdminShellProps {
  activeTab: MobileAdminTab;
  onTabChange: (tab: MobileAdminTab) => void;
  pendingUsersCount: number;
  pendingRequestsCount: number;
  children: React.ReactNode;
}

const TABS: { id: MobileAdminTab; label: string; icon: string; badge?: number }[] = [
  { id: 'catalog', label: 'Catálogo', icon: 'home' },
  { id: 'users', label: 'Alunos', icon: 'users', badge: 0 },
  { id: 'requests', label: 'Pedidos', icon: 'listtodo', badge: 0 },
  { id: 'more', label: 'Mais', icon: 'more' },
];

export function MobileAdminShell({
  activeTab,
  onTabChange,
  pendingUsersCount,
  pendingRequestsCount,
  children,
}: MobileAdminShellProps) {
  const tabs = TABS.map((tab) => ({
    ...tab,
    badge:
      tab.id === 'users'
        ? pendingUsersCount
        : tab.id === 'requests'
          ? pendingRequestsCount
          : undefined,
  }));

  return (
    <div className="mobile-admin-shell">
      <div className="mobile-admin-shell__content">{children}</div>
      <nav className="mobile-bottom-nav mobile-bottom-nav--admin" aria-label="Admin mobile">
        {tabs.map(({ id, label, icon, badge }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              className={`mobile-bottom-nav__item ${active ? 'mobile-bottom-nav__item--active' : ''}`}
              onClick={() => onTabChange(id)}
              aria-current={active ? 'page' : undefined}
            >
              <span className="mobile-bottom-nav__icon-wrap">
                <Icon name={icon} className="mobile-bottom-nav__icon" strokeWidth={active ? 2 : 1.5} />
                {badge != null && badge > 0 && (
                  <span className="mobile-bottom-nav__badge" aria-hidden="true">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className="mobile-bottom-nav__label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
