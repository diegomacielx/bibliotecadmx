import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BrandLogo } from '../BrandLogo';
import { Icon } from '../Icon';

export type MobileTab = 'home' | 'favorites' | 'search' | 'account';

const NAV_LAYER_ID = 'dmx-mobile-nav-layer';

interface MobileShellProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onBrandPress: () => void;
  favoritesCount: number;
  /** Lightbox de reprodução aberto — nav deve ficar acima de tudo */
  playbackElevated?: boolean;
  children: React.ReactNode;
}

const SIDE_TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: 'home', label: 'Início', icon: 'home' },
  { id: 'favorites', label: 'Favoritos', icon: 'heart' },
  { id: 'search', label: 'Busca', icon: 'search' },
  { id: 'account', label: 'Conta', icon: 'user' },
];

function NavItem({
  id,
  label,
  icon,
  active,
  showBadge,
  badgeCount,
  onTabChange,
}: {
  id: MobileTab;
  label: string;
  icon: string;
  active: boolean;
  showBadge?: boolean;
  badgeCount?: number;
  onTabChange: (tab: MobileTab) => void;
}) {
  return (
    <button
      type="button"
      className={`mobile-bottom-nav__item ${active ? 'mobile-bottom-nav__item--active' : ''}`}
      onClick={() => onTabChange(id)}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={label}
    >
      <span className="mobile-bottom-nav__icon-wrap">
        <Icon name={icon} className="mobile-bottom-nav__icon" strokeWidth={active ? 2.25 : 1.75} />
        {showBadge && badgeCount != null && badgeCount > 0 && (
          <span className="mobile-bottom-nav__badge" aria-hidden="true">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </span>
    </button>
  );
}

function ensureNavLayerHost(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let host = document.getElementById(NAV_LAYER_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = NAV_LAYER_ID;
    host.className = 'dmx-mobile-nav-layer';
    document.body.appendChild(host);
  }
  return host;
}

export function MobileShell({
  activeTab,
  onTabChange,
  onBrandPress,
  favoritesCount,
  playbackElevated = false,
  children,
}: MobileShellProps) {
  const leftTabs = SIDE_TABS.slice(0, 2);
  const rightTabs = SIDE_TABS.slice(2);
  const [navHost, setNavHost] = useState<HTMLElement | null>(() => ensureNavLayerHost());

  useLayoutEffect(() => {
    const host = ensureNavLayerHost();
    setNavHost(host);
  }, []);

  useEffect(() => {
    const host = ensureNavLayerHost();
    if (!host) return;
    host.dataset.playbackElevated = playbackElevated ? 'true' : 'false';
    if (playbackElevated) {
      document.body.appendChild(host);
    }
  }, [playbackElevated]);

  const bottomNav = (
    <nav
      className={`mobile-bottom-nav mobile-bottom-nav--floating mobile-bottom-nav--portaled${
        playbackElevated ? ' mobile-bottom-nav--playback-top' : ''
      }`}
      aria-label="Navegação principal"
    >
      {leftTabs.map((tab) => (
        <NavItem
          key={tab.id}
          {...tab}
          active={activeTab === tab.id}
          showBadge={tab.id === 'favorites'}
          badgeCount={favoritesCount}
          onTabChange={onTabChange}
        />
      ))}

      <button
        type="button"
        className={`mobile-bottom-nav__item mobile-bottom-nav__item--brand ${
          activeTab === 'home' ? 'mobile-bottom-nav__item--active' : ''
        }`}
        onClick={onBrandPress}
        aria-label="Início — limpar filtros e voltar ao catálogo"
        title="Início"
        aria-current={activeTab === 'home' ? 'page' : undefined}
      >
        <span className="mobile-bottom-nav__brand-wrap">
          <BrandLogo variant="header" className="mobile-bottom-nav__brand-logo" />
        </span>
      </button>

      {rightTabs.map((tab) => (
        <NavItem
          key={tab.id}
          {...tab}
          active={activeTab === tab.id}
          onTabChange={onTabChange}
        />
      ))}
    </nav>
  );

  return (
    <div className="mobile-shell">
      <div className="mobile-shell__content">{children}</div>
      {navHost ? createPortal(bottomNav, navHost) : bottomNav}
    </div>
  );
}
