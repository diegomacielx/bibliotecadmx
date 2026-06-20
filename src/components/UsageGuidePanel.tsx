import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { USAGE_GUIDE_SECTIONS } from '../lib/usageGuide';
import { Icon } from './Icon';

interface UsageGuidePanelProps {
  open: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
}

function GuideSection({
  title,
  intro,
  items,
}: {
  title: string;
  intro?: string;
  items: (typeof USAGE_GUIDE_SECTIONS)[number]['items'];
}) {
  return (
    <section className="usage-guide__section">
      <h3 className="usage-guide__section-title">{title}</h3>
      {intro ? <p className="usage-guide__section-intro">{intro}</p> : null}
      <ul className="usage-guide__list">
        {items.map((item) => (
          <li key={item.id} className="usage-guide__item">
            <h4 className="usage-guide__item-title">{item.title}</h4>
            <p className="usage-guide__item-desc">{item.description}</p>
            {item.steps && item.steps.length > 0 && (
              <ul className="usage-guide__steps">
                {item.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function UsageGuidePanel({ open, onClose, onOpenShortcuts }: UsageGuidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
    panelRef.current?.focus();
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="usage-guide-overlay"
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
            aria-labelledby="usage-guide-title"
            tabIndex={-1}
            className="usage-guide-panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="usage-guide__header">
              <div>
                <span className="usage-guide__eyebrow">Biblioteca DMX</span>
                <h2 id="usage-guide-title" className="usage-guide__title">
                  Guia de uso
                </h2>
                <p className="usage-guide__subtitle">
                  Tudo o que você pode fazer na biblioteca e como usar cada recurso.
                </p>
              </div>
              <button
                type="button"
                className="usage-guide__close"
                onClick={onClose}
                aria-label="Fechar guia de uso"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </header>

            <div className="usage-guide__body">
              {USAGE_GUIDE_SECTIONS.map((section) => (
                <GuideSection
                  key={section.id}
                  title={section.title}
                  intro={section.intro}
                  items={section.items}
                />
              ))}
            </div>

            <footer className="usage-guide__footer">
              {onOpenShortcuts ? (
                <button
                  type="button"
                  className="usage-guide__footer-link"
                  onClick={() => {
                    onClose();
                    onOpenShortcuts();
                  }}
                >
                  Ver atalhos de teclado
                </button>
              ) : (
                <p>Pressione Esc para fechar</p>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
