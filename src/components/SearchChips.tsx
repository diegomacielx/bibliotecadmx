import { motion, AnimatePresence } from 'framer-motion';
import type { RecentExercise } from '../hooks/useSearchHistory';
import { Icon } from './Icon';

interface SearchChipsProps {
  history: string[];
  recents: RecentExercise[];
  visible: boolean;
  onSelectHistory: (term: string) => void;
  onSelectRecent: (firestoreId: string, name: string) => void;
  onRemoveHistory: (term: string) => void;
  onClearHistory: () => void;
}

export function SearchChips({
  history,
  recents,
  visible,
  onSelectHistory,
  onSelectRecent,
  onRemoveHistory,
  onClearHistory,
}: SearchChipsProps) {
  if (!visible || (history.length === 0 && recents.length === 0)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="search-chips-panel"
      >
        {recents.length > 0 && (
          <div className="search-chips-section">
            <span className="search-chips-label">
              <Icon name="clock" className="w-3.5 h-3.5" /> Recentes
            </span>
            <div className="search-chips-list">
              {recents.map((r) => (
                <button
                  key={r.firestoreId}
                  type="button"
                  className="control-chip search-chip"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelectRecent(r.firestoreId, r.name)}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="search-chips-section">
            <div className="search-chips-section-head">
              <span className="search-chips-label">
                <Icon name="search" className="w-3.5 h-3.5" /> Buscas recentes
              </span>
              <button type="button" className="search-chips-clear" onClick={onClearHistory}>
                Limpar
              </button>
            </div>
            <div className="search-chips-list">
              {history.map((term) => (
                <span key={term} className="search-chip-group">
                  <button
                    type="button"
                    className="control-chip search-chip"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onSelectHistory(term)}
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    className="search-chip-remove"
                    onClick={() => onRemoveHistory(term)}
                    aria-label={`Remover ${term}`}
                  >
                    <Icon name="x" className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
