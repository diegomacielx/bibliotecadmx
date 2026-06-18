import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { buildShortcutSections, type ShortcutSection } from '../lib/keyboard';
import { Icon } from './Icon';

interface ShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
  hasLightboxNav?: boolean;
  hasCompare?: boolean;
  isAdmin?: boolean;
}

function ShortcutKeys({ keys }: { keys: string[] }) {
  return (
    <span className="shortcuts-panel__keys">
      {keys.map((key, i) => (
        <span key={`${key}-${i}`} className="shortcuts-panel__key-group">
          {i > 0 && <span className="shortcuts-panel__key-sep">+</span>}
          <kbd className="shortcuts-panel__kbd">{key}</kbd>
        </span>
      ))}
    </span>
  );
}

function ShortcutSectionBlock({ section }: { section: ShortcutSection }) {
  if (section.items.length === 0) return null;

  return (
    <section className="shortcuts-panel__section" aria-labelledby={`shortcuts-${section.id}`}>
      <h3 id={`shortcuts-${section.id}`} className="shortcuts-panel__section-title">
        {section.title}
      </h3>
      <ul className="shortcuts-panel__list">
        {section.items.map((item) => (
          <li key={item.id} className="shortcuts-panel__row">
            <span className="shortcuts-panel__label">{item.label}</span>
            <ShortcutKeys keys={item.keys} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ShortcutsPanel({
  open,
  onClose,
  hasLightboxNav = true,
  hasCompare = true,
  isAdmin = false,
}: ShortcutsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const sections = useMemo(
    () =>
      buildShortcutSections({
        hasLightboxNav,
        hasCompare,
        isAdmin,
      }),
    [hasLightboxNav, hasCompare, isAdmin]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="shortcuts-panel-overlay"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-panel-title"
            tabIndex={-1}
            className="shortcuts-panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shortcuts-panel__header">
              <div className="shortcuts-panel__header-copy">
                <span className="shortcuts-panel__eyebrow">Biblioteca DMX</span>
                <h2 id="shortcuts-panel-title" className="shortcuts-panel__title">
                  Atalhos de teclado
                </h2>
              </div>
              <button
                type="button"
                className="shortcuts-panel__close"
                onClick={onClose}
                aria-label="Fechar atalhos"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </header>

            <div className="shortcuts-panel__body">
              {sections.map((section) => (
                <ShortcutSectionBlock key={section.id} section={section} />
              ))}
            </div>

            <footer className="shortcuts-panel__footer">
              <p>
                Pressione <kbd className="shortcuts-panel__kbd shortcuts-panel__kbd--inline">?</kbd> ou{' '}
                <kbd className="shortcuts-panel__kbd shortcuts-panel__kbd--inline">Esc</kbd> para fechar
              </p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
