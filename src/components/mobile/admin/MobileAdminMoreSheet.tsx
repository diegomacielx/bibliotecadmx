import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { AdminTab } from '../../../types';
import { Icon } from '../../Icon';

interface MobileAdminMoreSheetProps {
  open: boolean;
  onClose: () => void;
  onOpenTab: (tab: AdminTab) => void;
  onNewExercise: () => void;
  onToggleUserPreview?: () => void;
  adminUserPreview?: boolean;
  onLogout: () => void;
}

const QUICK_ITEMS: { tab?: AdminTab; label: string; icon: string; action?: 'new' | 'preview' | 'logout' }[] = [
  { action: 'new', label: 'Novo exercício', icon: 'pluscircle' },
  { action: 'preview', label: 'Visão de usuário', icon: 'eye' },
  { tab: 'single', label: 'Cadastro único', icon: 'plus' },
];

const DESKTOP_ITEMS: { tab: AdminTab; label: string; icon: string; hint: string }[] = [
  { tab: 'batch', label: 'Importar lote', icon: 'server', hint: 'Desktop recomendado' },
  { tab: 'authorized', label: 'Autorizar e-mails', icon: 'mail', hint: 'Desktop recomendado' },
  { tab: 'audit', label: 'Auditoria Cloud', icon: 'cloud', hint: 'Desktop recomendado' },
  { tab: 'settings', label: 'Integrações e destaque', icon: 'settings', hint: 'Desktop recomendado' },
];

export function MobileAdminMoreSheet({
  open,
  onClose,
  onOpenTab,
  onNewExercise,
  onToggleUserPreview,
  adminUserPreview = false,
  onLogout,
}: MobileAdminMoreSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleItem = (item: (typeof QUICK_ITEMS)[number]) => {
    onClose();
    if (item.action === 'new') {
      onNewExercise();
      return;
    }
    if (item.action === 'preview') {
      onToggleUserPreview?.();
      return;
    }
    if (item.action === 'logout') {
      void onLogout();
      return;
    }
    if (item.tab) onOpenTab(item.tab);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="mobile-filter-sheet__overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-admin-more-title"
            className="mobile-filter-sheet mobile-admin-more-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-filter-sheet__handle" aria-hidden="true" />
            <header className="mobile-filter-sheet__header">
              <h2 id="mobile-admin-more-title" className="mobile-filter-sheet__title">
                Mais opções
              </h2>
              <button type="button" className="mobile-filter-sheet__close" onClick={onClose} aria-label="Fechar">
                <Icon name="x" className="w-4 h-4" />
              </button>
            </header>

            <div className="mobile-admin-more-sheet__body">
              <section className="mobile-admin-more-sheet__section">
                <h3 className="mobile-admin-more-sheet__section-title">Ações rápidas</h3>
                <div className="mobile-admin-more-sheet__list">
                  {QUICK_ITEMS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`mobile-admin-more-sheet__item ${
                        item.action === 'preview' && adminUserPreview
                          ? 'mobile-admin-more-sheet__item--active'
                          : ''
                      }`}
                      onClick={() => handleItem(item)}
                    >
                      <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mobile-admin-more-sheet__section">
                <h3 className="mobile-admin-more-sheet__section-title">Studio avançado</h3>
                <p className="mobile-admin-more-sheet__hint">
                  Disponível no celular, mas recomendamos usar um computador.
                </p>
                <div className="mobile-admin-more-sheet__list">
                  {DESKTOP_ITEMS.map((item) => (
                    <button
                      key={item.tab}
                      type="button"
                      className="mobile-admin-more-sheet__item mobile-admin-more-sheet__item--desktop"
                      onClick={() => {
                        onClose();
                        onOpenTab(item.tab);
                      }}
                    >
                      <Icon name={item.icon} className="w-4 h-4 shrink-0" />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block">{item.label}</span>
                        <span className="mobile-admin-more-sheet__item-hint">{item.hint}</span>
                      </span>
                      <Icon name="right" className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    </button>
                  ))}
                </div>
              </section>

              <button
                type="button"
                className="mobile-admin-more-sheet__logout"
                onClick={() => handleItem({ label: 'Sair', icon: 'logout', action: 'logout' })}
              >
                <Icon name="logout" className="w-4 h-4" />
                Sair da conta
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
