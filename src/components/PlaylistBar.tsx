import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '../types';
import { Icon } from './Icon';

interface PlaylistBarProps {
  playlist: Exercise[];
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onPlay: () => void;
  onClear: () => void;
}

export function PlaylistBar({
  playlist,
  selectionMode,
  onToggleSelectionMode,
  onPlay,
  onClear,
}: PlaylistBarProps) {
  const count = playlist.length;

  return (
    <>
      <motion.button
        type="button"
        className="playlist-fab"
        onClick={onToggleSelectionMode}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={selectionMode ? 'Sair do modo treino' : 'Montar treino'}
        aria-pressed={selectionMode}
      >
        <Icon name={selectionMode ? 'x' : 'listvideo'} className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {(selectionMode || count > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="playlist-bar"
          >
            <div className="playlist-bar-inner">
              <div className="flex items-center gap-3 min-w-0">
                <span className="playlist-bar-badge">{count}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {selectionMode ? 'Modo treino' : 'Sua playlist'}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {count === 0
                      ? 'Toque nos cards na ordem do treino'
                      : `Ordem de reprodução: ${count} exercício${count !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {count > 0 && (
                  <>
                    <button type="button" className="playlist-bar-btn playlist-bar-btn--ghost" onClick={onClear}>
                      Limpar
                    </button>
                    <button type="button" className="playlist-bar-btn playlist-bar-btn--primary" onClick={onPlay}>
                      <Icon name="play" className="w-3.5 h-3.5" /> Iniciar
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
