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
  animated?: boolean;
}

const CONFIG: Record<
  EmptyStateVariant,
  { icon: string; title: string; getDescription: (searchTerm?: string, category?: string) => string }
> = {
  search: {
    icon: 'search',
    title: 'Nenhum resultado',
    getDescription: (term) =>
      term?.trim()
        ? `Não encontramos exercícios para “${term}”. Tente outro termo ou sugira uma gravação.`
        : 'Não encontramos exercícios com esses critérios.',
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
  animated = true,
}: EmptyStateProps) {
  const { icon, title, getDescription } = CONFIG[variant];
  const description = getDescription(searchTerm, category);

  const content = (
    <>
      <div className="empty-state" role="status">
        <div className="empty-state__glow" aria-hidden="true" />
        <div className="empty-state__icon-wrap">
          <Icon name={icon} className="empty-state__icon" strokeWidth={1.5} />
        </div>
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__description">{description}</p>
        <div className="empty-state__actions">
          {variant === 'search' && searchTerm?.trim() && onSuggest && (
            <button type="button" onClick={onSuggest} className="empty-state__cta">
              <Icon name="lightbulb" className="w-4 h-4" />
              Sugerir gravação de “{searchTerm}”
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
        </div>
        {variant === 'search' && (
          <p className="empty-state__hint">
            Pressione <kbd className="empty-state__kbd">Esc</kbd> para voltar à categoria anterior
          </p>
        )}
      </div>
      {variant === 'search' && onGoHome && (
        <button
          type="button"
          className="empty-state__home-fab"
          onClick={onGoHome}
          aria-label="Voltar ao início — categoria Todos"
          title="Voltar ao início"
        >
          <Icon name="x" className="w-5 h-5" strokeWidth={2} />
        </button>
      )}
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
