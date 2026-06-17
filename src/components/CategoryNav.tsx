import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icon';

interface CategoryNavProps {
  categories: readonly string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  favoritesCount?: number;
}

export function CategoryNav({
  categories,
  activeCategory,
  onCategoryChange,
  favoritesCount = 0,
}: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <nav className="category-nav cinema-container mb-fluid-lg relative z-10" aria-label="Categorias">
      <div className="category-nav-inner">
        <button
          type="button"
          className="category-nav-arrow hidden sm:flex"
          onClick={() => scroll('left')}
          aria-label="Categorias anteriores"
        >
          <Icon name="left" className="w-3.5 h-3.5" />
        </button>

        <div className="category-nav-scroll no-scrollbar" ref={scrollRef}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const isFav = cat === 'Favoritos';
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`category-nav-pill relative ${isActive ? 'category-nav-pill--active' : ''}`}
                aria-current={isActive ? 'true' : undefined}
              >
                {isFav && <Icon name="heart" className="w-3 h-3 inline mr-1 -mt-0.5" />}
                {cat}
                {isFav && favoritesCount > 0 && (
                  <span className="ml-1 text-[10px] opacity-70">({favoritesCount})</span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="category-pill-indicator"
                    className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-red-500"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="category-nav-arrow hidden sm:flex"
          onClick={() => scroll('right')}
          aria-label="Próximas categorias"
        >
          <Icon name="right" className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
