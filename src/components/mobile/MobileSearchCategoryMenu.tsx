import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../Icon';

interface MobileSearchCategoryMenuProps {
  categories: readonly string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
}

export function MobileSearchCategoryMenu({
  categories,
  activeCategory,
  onCategoryChange,
}: MobileSearchCategoryMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  return (
    <div className="mobile-search-category-menu" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mobile-shell-header__lead-btn header-action header-action--icon"
        aria-label="Filtrar por categoria"
        aria-expanded={open}
        title={activeCategory === 'Todos' ? 'Todas as categorias' : `Categoria: ${activeCategory}`}
      >
        <span className="header-action-icon-slot">
          <Icon name="filter" className="shrink-0" strokeWidth={1.35} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mobile-search-category-menu__panel dropdown-panel z-[9999]"
              role="menu"
            >
              <p className="mobile-search-category-menu__heading">Categoria</p>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="menuitemradio"
                  aria-checked={cat === activeCategory}
                  className={`mobile-search-category-menu__item${cat === activeCategory ? ' is-active' : ''}`}
                  onClick={() => {
                    onCategoryChange(cat);
                    setOpen(false);
                  }}
                >
                  <span>{cat}</span>
                  {cat === activeCategory && <Icon name="check" className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
