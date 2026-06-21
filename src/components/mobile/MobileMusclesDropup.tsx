import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { normalizeMuscleGroups } from '../../lib/muscleGroups';
import { Icon } from '../Icon';

interface MobileMusclesDropupProps {
  groups: string[] | undefined | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function MobileMusclesDropup({ groups, open, onOpen, onClose }: MobileMusclesDropupProps) {
  const muscles = normalizeMuscleGroups(groups);
  if (muscles.length === 0) return null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <button
        type="button"
        className="cinema-mobile-reels-rail-btn cinema-mobile-reels-rail-btn--muscles"
        onClick={onOpen}
        aria-label="Ver músculos trabalhados"
        aria-expanded={open}
        title="Músculos"
      >
        <Icon name="biceps" className="w-6 h-6" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="mobile-muscles-dropup-layer" role="presentation">
            <motion.button
              type="button"
              className="mobile-muscles-dropup-backdrop"
              aria-label="Fechar músculos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Músculos trabalhados"
              className="mobile-muscles-dropup"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            >
              <div className="mobile-muscles-dropup__handle" aria-hidden="true" />
              <div className="mobile-muscles-dropup__header">
                <span className="mobile-muscles-dropup__eyebrow">Músculos</span>
                <button
                  type="button"
                  className="mobile-muscles-dropup__close"
                  onClick={onClose}
                  aria-label="Fechar"
                >
                  <Icon name="x" className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
              <ul className="mobile-muscles-dropup__list">
                {muscles.map((muscle) => (
                  <li key={muscle} className="mobile-muscles-dropup__item">
                    <span className="mobile-muscles-dropup__dot" aria-hidden="true" />
                    {muscle}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
