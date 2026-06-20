import { motion } from 'framer-motion';
import { Icon } from './Icon';

export type EmptyStateVariant = 'search' | 'favorites' | 'category' | 'filters';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  searchTerm?: string;
  category?: string;
  onSuggest?: () => void;
  onClearFilters?: () => void;
  onGoHome?: () => void;
  onSearchAllCategories?: () => void;
  animated?: boolean;
}

const CONFIG: Record<
  EmptyStateVariant,
  { icon: string; title: string; getDescription: (searchTerm?: string, category?: string) => string | null }
> = {
  search: {
    icon: 'search',
    title: 'Nenhum resultado',
    getDescription: (term, category) => {
      if (term?.trim() && category && category !== 'Todos') {
        return null;
      }
      if (term?.trim()) {
        return `Não encontramos exercícios para “${term}”. Tente outro termo ou sugira uma gravação.`;
      }
      return 'Não encontramos exercícios com esses critérios.';
    },
  },
  favorites: {
    icon: 'heart',
    title: 'Nenhum favorito ainda',
    getDescription: () =>
      'Marque exercícios com o coração nos cards para montar sua biblioteca pessoal e acessá-los aqui.',
  },
  category: {
    icon: 'dashboard',
    title: 'Categoria vazia',
    getDescription: (_term, category) =>
      category && category !== 'Todos'
        ? `Ainda não há exercícios publicados em “${category}”.`
        : 'Nenhum exercício disponível no momento.',
  },
  filters: {
    icon: 'filter',
    title: 'Nenhum exercício com esses filtros',
    getDescription: () =>
      'Tente remover algum critério ou limpar os filtros avançados para ver mais resultados.',
  },
};

export function EmptyState({
  variant,
  searchTerm,
  category,
  onSuggest,
  onClearFilters,
  onGoHome,
  onSearchAllCategories,
  animated = true,
}: EmptyStateProps) {
  const { icon, title, getDescription } = CONFIG[variant];
  const description = getDescription(searchTerm, category);
  const isCategoryScopedSearch =
    variant === 'search' &&
    !!searchTerm?.trim() &&
    !!category &&
    category !== 'Todos';

  const content = (
    <>
      <div className="empty-state" role="status">
        <div className="empty-state__glow" aria-hidden="true" />
        <div className="empty-state__icon-wrap">
          <Icon name={icon} className="empty-state__icon" strokeWidth={1.5} />
        </div>
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__description">
          {isCategoryScopedSearch ? (
            <>
              Não encontramos exercícios para “{searchTerm}” na categoria{' '}
              <span className="empty-state__category-emphasis">{category}</span>. Busque em todas as
              categorias ou sugira uma gravação.
            </>
          ) : (
            description
          )}
        </p>
        <div className="empty-state__actions">
          {variant === 'search' && searchTerm?.trim() && onSuggest && (
            <button type="button" onClick={onSuggest} className="empty-state__cta">
              <Icon name="lightbulb" className="w-4 h-4" />
              Sugerir gravação de “{searchTerm}”
            </button>
          )}
          {variant === 'search' &&
            searchTerm?.trim() &&
            category &&
            category !== 'Todos' &&
            onSearchAllCategories && (
              <button
                type="button"
                onClick={onSearchAllCategories}
                className="empty-state__cta empty-state__cta--ghost"
              >
                Buscar em todas as categorias
              </button>
            )}
          {variant === 'favorites' && onClearFilters && (
            <button type="button" onClick={onClearFilters} className="empty-state__cta empty-state__cta--ghost">
              Explorar todos os exercícios
            </button>
          )}
          {variant === 'category' && category && category !== 'Todos' && onClearFilters && (
            <button type="button" onClick={onClearFilters} className="empty-state__cta empty-state__cta--ghost">
              Ver todas as categorias
            </button>
          )}
          {variant === 'filters' && onClearFilters && (
            <button type="button" onClick={onClearFilters} className="empty-state__cta empty-state__cta--ghost">
              Limpar filtros avançados
            </button>
          )}
          {variant === 'search' && onGoHome && (
            <button
              type="button"
              onClick={onGoHome}
              className="empty-state__cta empty-state__cta--glass"
              aria-label="Voltar ao início — categoria Todos"
            >
              <Icon name="x" className="w-4 h-4 shrink-0" strokeWidth={2} />
              Voltar ao início
            </button>
          )}
        </div>
        {variant === 'search' && (
          <p className="empty-state__hint">
            Pressione <kbd className="empty-state__kbd">Esc</kbd> para voltar à categoria anterior
          </p>
        )}
      </div>
    </>
  );

  if (!animated) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}
