import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '../types';
import { buildGitHubCoverUrls } from '../lib/utils';
import { getCoverFrameStyle } from '../lib/coverFocus';
import { getCoverPlaceholderStyle } from './ExerciseCoverPlaceholder';
import { Icon } from './Icon';

interface SearchSuggestionsProps {
  query: string;
  suggestions: Exercise[];
  onSelect: (ex: Exercise) => void;
  onSearchAll: () => void;
  visible: boolean;
}

export function SearchSuggestions({
  query,
  suggestions,
  onSelect,
  onSearchAll,
  visible,
}: SearchSuggestionsProps) {
  if (!visible || !query.trim()) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="search-suggestions"
        role="listbox"
        aria-label="Sugestões de busca"
      >
        {suggestions.length === 0 ? (
          <p className="search-suggestions-empty">
            Nenhuma sugestão — pressione Enter para buscar
          </p>
        ) : (
          suggestions.map((ex) => {
            const thumb = buildGitHubCoverUrls(ex)[0];
            const muscles = ex.muscleGroups?.slice(0, 2).join(', ');

            return (
              <button
                key={ex.firestoreId}
                type="button"
                role="option"
                className="search-suggestion-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelect(ex)}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="search-suggestion-thumb"
                    style={{
                      objectPosition: getCoverFrameStyle(ex).objectPosition,
                      ...(getCoverFrameStyle(ex).cssVars as React.CSSProperties),
                    }}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                ) : (
                  <span
                    className="search-suggestion-thumb search-suggestion-thumb--art"
                    style={getCoverPlaceholderStyle(ex.id, ex.category)}
                    aria-hidden="true"
                  />
                )}
                <div className="search-suggestion-body">
                  <p className="search-suggestion-title">{ex.name}</p>
                  <p className="search-suggestion-meta">
                    <span className="search-suggestion-id">#{ex.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ex.category}</span>
                    {muscles ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="search-suggestion-muscles">{muscles}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <span className="search-suggestion-play" aria-hidden="true">
                  <Icon name="play" className="w-4 h-4" />
                </span>
              </button>
            );
          })
        )}
        {suggestions.length > 0 && (
          <button type="button" className="search-suggestion-footer" onClick={onSearchAll}>
            Ver todos os resultados para &quot;{query.trim()}&quot;
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
