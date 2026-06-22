import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GlassToggle } from './GlassToggle';
import { Icon } from './Icon';
import type { ExerciseSortOrder } from '../lib/utils';
import { useTouchLayout } from '../hooks/useMediaQuery';

interface StudentSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  exerciseSortOrder: ExerciseSortOrder;
  onExerciseSortOrderChange: (order: ExerciseSortOrder) => void;
  saveRecentVideos: boolean;
  onToggleSaveRecentVideos: (enabled: boolean) => void;
  saveSearchHistory: boolean;
  onToggleSaveSearchHistory: (enabled: boolean) => void;
  liveSearchSuggestions: boolean;
  onToggleLiveSearchSuggestions: (enabled: boolean) => void;
  cardHoverPreview: boolean;
  onToggleCardHoverPreview: (enabled: boolean) => void;
  cardCoverParallax: boolean;
  onToggleCardCoverParallax: (enabled: boolean) => void;
  videoLoop: boolean;
  onToggleVideoLoop: (enabled: boolean) => void;
  compareLoopSync: boolean;
  onToggleCompareLoopSync: (enabled: boolean) => void;
}

export function StudentSettingsPanel({
  open,
  onClose,
  exerciseSortOrder,
  onExerciseSortOrderChange,
  saveRecentVideos,
  onToggleSaveRecentVideos,
  saveSearchHistory,
  onToggleSaveSearchHistory,
  liveSearchSuggestions,
  onToggleLiveSearchSuggestions,
  cardHoverPreview,
  onToggleCardHoverPreview,
  cardCoverParallax,
  onToggleCardCoverParallax,
  videoLoop,
  onToggleVideoLoop,
  compareLoopSync,
  onToggleCompareLoopSync,
}: StudentSettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const touchLayout = useTouchLayout();

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
            aria-labelledby="student-settings-title"
            tabIndex={-1}
            className="usage-guide-panel student-settings-panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="usage-guide__header">
              <div>
                <span className="usage-guide__eyebrow">Biblioteca DMX</span>
                <h2 id="student-settings-title" className="usage-guide__title">
                  Configurações
                </h2>
                <p className="usage-guide__subtitle">
                  Ordenação, busca, catálogo, recentes e reprodução. Suas escolhas ficam salvas neste
                  navegador.
                </p>
              </div>
              <button
                type="button"
                className="usage-guide__close"
                onClick={onClose}
                aria-label="Fechar configurações"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </header>

            <div className="usage-guide__body student-settings__body">
              <section className="student-settings__section">
                <h3 className="student-settings__section-title">Busca e catálogo</h3>
                <div className="student-settings__toggles">
                  <GlassToggle
                    label="Salvar vídeos recentes"
                    hint={
                      saveRecentVideos
                        ? 'Recentes na barra de busca lista os últimos vídeos que você abriu.'
                        : 'Desligado: exercícios assistidos não aparecem em Recentes.'
                    }
                    checked={saveRecentVideos}
                    onChange={onToggleSaveRecentVideos}
                    transitionSpeed="instant"
                  />
                  <GlassToggle
                    label="Salvar buscas recentes"
                    hint={
                      saveSearchHistory
                        ? 'Termos buscados aparecem ao focar na barra de pesquisa.'
                        : 'Desligado: novas buscas não entram no histórico.'
                    }
                    checked={saveSearchHistory}
                    onChange={onToggleSaveSearchHistory}
                    transitionSpeed="instant"
                  />
                  <GlassToggle
                    label="Resultados ao digitar"
                    hint={
                      liveSearchSuggestions
                        ? 'Enquanto você digita, aparecem sugestões com capa e nome do exercício.'
                        : 'Desligado: use Enter para ver resultados apenas no catálogo.'
                    }
                    checked={liveSearchSuggestions}
                    onChange={onToggleLiveSearchSuggestions}
                    transitionSpeed="instant"
                  />
                  {!touchLayout && (
                  <GlassToggle
                    label="Ordem alfabética (A–Z)"
                    hint={
                      exerciseSortOrder === 'alpha'
                        ? 'Exercícios listados pelo nome, de A a Z.'
                        : 'Desligado: ordem por ID numérico (0001, 0002, 0003…).'
                    }
                    checked={exerciseSortOrder === 'alpha'}
                    onChange={(checked) => onExerciseSortOrderChange(checked ? 'alpha' : 'id')}
                    transitionSpeed="instant"
                  />
                  )}
                  {!touchLayout && (
                  <>
                  <GlassToggle
                    label="Preview ao passar o mouse"
                    hint={
                      cardHoverPreview
                        ? 'Passe o mouse na capa para ver um trecho rápido do vídeo.'
                        : 'Desligado: só a imagem da capa, sem reproduzir ao hover.'
                    }
                    checked={cardHoverPreview}
                    onChange={onToggleCardHoverPreview}
                    transitionSpeed="instant"
                  />
                  <GlassToggle
                    label="Parallax nas capas"
                    hint={
                      cardCoverParallax
                        ? 'Movimento 3D e deslocamento da capa ao passar o mouse.'
                        : 'Desligado: capas estáticas — melhor desempenho em notebooks modestos.'
                    }
                    checked={cardCoverParallax}
                    onChange={onToggleCardCoverParallax}
                    transitionSpeed="instant"
                  />
                  </>
                  )}
                </div>
              </section>

              <section className="student-settings__section">
                <h3 className="student-settings__section-title">Reprodução</h3>
                <div className="student-settings__toggles">
                  <GlassToggle
                    label="Repetir vídeo em loop"
                    hint={
                      videoLoop
                        ? 'Ao terminar, o vídeo recomeça do início automaticamente.'
                        : 'Desligado: o vídeo para quando chega ao fim.'
                    }
                    checked={videoLoop}
                    onChange={onToggleVideoLoop}
                  />
                  {!touchLayout && (
                  <GlassToggle
                    label="Loop sincronizado no comparador"
                    hint={
                      compareLoopSync
                        ? 'No comparador: ao terminar um vídeo, os dois recomeçam juntos do início.'
                        : 'No comparador: cada vídeo só reinicia quando o próprio termina.'
                    }
                    checked={compareLoopSync}
                    onChange={onToggleCompareLoopSync}
                    disabled={!videoLoop}
                  />
                  )}
                </div>
              </section>
            </div>

            <footer className="usage-guide__footer">
              <p>Pressione Esc para fechar</p>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
