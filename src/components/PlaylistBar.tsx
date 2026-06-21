import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise } from '../types';
import { Icon } from './Icon';

interface PlaylistBarProps {
  playlist: Exercise[];
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onPlay: () => void;
  onClear: () => void;
  mobileShellMode?: boolean;
}

export function PlaylistBar({
  playlist,
  selectionMode,
  onToggleSelectionMode,
  onPlay,
  onClear,
  mobileShellMode = false,
}: PlaylistBarProps) {
  const count = playlist.length;
  const barVisible = selectionMode || count > 0;

  return (
    <>
      <motion.button
        type="button"
        className={`playlist-fab ${mobileShellMode ? 'playlist-fab--mobile-shell' : ''}`}
        onClick={onToggleSelectionMode}
        whileHover={mobileShellMode ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={selectionMode ? 'Sair do modo playlist' : 'Montar playlist'}
        aria-pressed={selectionMode}
      >
        <Icon name={selectionMode ? 'x' : 'listvideo'} className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {barVisible && (
          <motion.div
            initial={{ opacity: 0, y: mobileShellMode ? 24 : 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: mobileShellMode ? 24 : 80 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className={`playlist-bar ${mobileShellMode ? 'playlist-bar--mobile-shell' : ''}`}
          >
            <div className="playlist-bar-inner">
              <div className="flex items-center gap-3 min-w-0">
                <span className="playlist-bar-badge">{count}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {selectionMode ? 'Modo playlist' : 'Sua playlist'}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {count === 0
                      ? 'Clique nos cards na ordem da playlist'
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
                {selectionMode && count === 0 && (
                  <button
                    type="button"
                    className="playlist-bar-btn playlist-bar-btn--ghost"
                    onClick={onToggleSelectionMode}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
