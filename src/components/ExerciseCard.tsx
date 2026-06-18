import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exercise, ExerciseForm, AdminTab } from '../types';
import {
  getDbPath,
  getYouTubeId,
  isYouTubeShort,
  openYouTubeWatch,
} from '../lib/utils';
import { deleteDoc, fbDoc, db } from '../lib/firebase';
import { useAmbientGlow } from '../hooks/useMousePosition';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTilt3D } from '../hooks/useTilt3D';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getSpring, staggerItem } from '../lib/motion';
import { getCoverObjectPosition, formatCoverFocusYInput } from '../lib/coverFocus';
import { useTouchLayout } from '../hooks/useMediaQuery';
import { MuscleGroupList } from './MuscleGroupList';
import { Skeleton } from './Skeleton';
import { Icon } from './Icon';
import { YouTubePlayer, preloadYouTubePlayerApi } from './YouTubePlayer';

interface ExerciseCardProps {
  ex: Exercise;
  index: number;
  isAdmin: boolean;
  isExerciseIncomplete: (url: string) => boolean;
  handleDownloadCheck: (e: React.MouseEvent, ex: Exercise, quality: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setForm: (form: ExerciseForm) => void;
  setEditingId: (id: string | null) => void;
  setAdminTab: (tab: AdminTab) => void;
  setShowAdminPanel: (show: boolean) => void;
  copyLink: (url: string, firestoreId: string) => void;
  copiedId: string | null;
  onWatch: (ex: Exercise) => void;
  selectionMode?: boolean;
  isInPlaylist?: boolean;
  onTogglePlaylist?: (ex: Exercise) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (ex: Exercise) => void;
  onCompare?: (ex: Exercise) => void;
  isComparePick?: boolean;
  playlistSequence?: number;
}

export function ExerciseCard({
  ex,
  index,
  isAdmin,
  isExerciseIncomplete,
  handleDownloadCheck,
  showToast,
  setForm,
  setEditingId,
  setAdminTab,
  setShowAdminPanel,
  copyLink,
  copiedId,
  onWatch,
  selectionMode = false,
  isInPlaylist = false,
  onTogglePlaylist,
  isFavorite = false,
  onToggleFavorite,
  onCompare,
  isComparePick = false,
  playlistSequence,
}: ExerciseCardProps) {
  const touchLayout = useTouchLayout();
  const [showPreview, setShowPreview] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { imgSrc, imgLoaded, handleLoad, handleError } = useExerciseCover(ex);
  const handleGlow = useAmbientGlow<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const tilt = useTilt3D(6, !reducedMotion);
  const ytId = getYouTubeId(ex.youtubeUrl);
  const canPreview = !!ytId && !reducedMotion;
  const coverObjectPosition = getCoverObjectPosition(ex);
  const showMobileActions = touchLayout && (mobileExpanded || selectionMode);
  const showCenterPlay = touchLayout && mobileExpanded && !selectionMode;

  useEffect(() => {
    if (!selectionMode) return;
    setMobileExpanded(false);
  }, [selectionMode]);

  useEffect(() => {
    if (!downloadOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [downloadOpen]);

  useEffect(() => {
    if (!mobileExpanded || selectionMode) return;
    const onPointerDown = (e: PointerEvent) => {
      if (coverRef.current?.contains(e.target as Node)) return;
      setMobileExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [mobileExpanded, selectionMode]);

  const handleMouseEnter = useCallback(() => {
    void preloadYouTubePlayerApi();
    if (!canPreview || touchLayout) return;
    previewTimerRef.current = setTimeout(() => setShowPreview(true), 450);
  }, [canPreview, touchLayout]);

  const handleMouseLeave = useCallback(() => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    setShowPreview(false);
  }, []);

  useEffect(
    () => () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    },
    []
  );

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm('Excluir exercício?')) {
      await deleteDoc(fbDoc(db, ...getDbPath(), ex.firestoreId));
    }
  };

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setForm({
      id: String(ex.id),
      name: ex.name,
      category: ex.category,
      muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups.join(', ') : '',
      keywords: Array.isArray(ex.keywords) ? ex.keywords.join(', ') : '',
      youtubeUrl: ex.youtubeUrl || '',
      thumbnail: ex.thumbnail || '',
      hasCloudVideo: ex.hasCloudVideo,
      coverFocusY: formatCoverFocusYInput(ex.coverFocusY),
    });
    setEditingId(ex.firestoreId);
    setAdminTab('single');
    setShowAdminPanel(true);
  };

  const handleCoverActivate = (e: React.SyntheticEvent) => {
    if (downloadOpen) return;
    if ((e.target as HTMLElement).closest('[data-card-play-trigger]')) return;
    if ((e.target as HTMLElement).closest('[data-card-action]')) return;
    if ((e.target as HTMLElement).closest('.card-download-menu')) return;

    if (touchLayout) {
      if (selectionMode && onTogglePlaylist) {
        e.stopPropagation();
        e.preventDefault();
        onTogglePlaylist(ex);
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      setMobileExpanded(true);
      return;
    }

    if (selectionMode && onTogglePlaylist) {
      e.stopPropagation();
      onTogglePlaylist(ex);
      return;
    }
    const me = e as React.MouseEvent;
    if (me.shiftKey && onCompare) {
      e.stopPropagation();
      onCompare(ex);
      return;
    }
    onWatch(ex);
  };

  const handleCoverClick = (e: React.MouseEvent) => {
    handleCoverActivate(e);
  };

  const handleCoverPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    handleCoverActivate(e);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMobileExpanded(false);
    if (touchLayout) {
      openYouTubeWatch(ex.youtubeUrl);
      return;
    }
    onWatch(ex);
  };

  const actionBtnClass = (extra = '') => `card-action-btn cursor-pointer ${extra}`.trim();

  return (
    <motion.div
      ref={tilt.ref}
      variants={staggerItem}
      custom={index}
      layout={!reducedMotion && !touchLayout}
      onMouseMove={(e) => {
        if (touchLayout) return;
        handleGlow(e);
        tilt.onMouseMove(e);
      }}
      onMouseLeave={() => {
        if (touchLayout) return;
        tilt.onMouseLeave();
        handleMouseLeave();
      }}
      onMouseEnter={handleMouseEnter}
      style={
        reducedMotion || touchLayout
          ? undefined
          : {
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              transformPerspective: 900,
            }
      }
      className={`exercise-card cinematic-card card-grid-item card-3d group relative rounded-cinema-lg border shadow-cinematic hover:shadow-cinematic-red ease-cinematic duration-cinematic ${
        isAdmin ? 'exercise-card--admin' : ''
      } ${downloadOpen || mobileExpanded || selectionMode ? 'card-actions-pinned z-[50]' : 'z-10'} ${
        mobileExpanded ? 'card-mobile-expanded' : ''
      } ${selectionMode ? 'card-selection-mode' : ''} ${
        isComparePick
          ? 'border-red-500 ring-2 ring-red-500/40'
          : isInPlaylist
            ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
            : 'border-white/5 hover:border-white/10'
      }`}
      whileHover={
        reducedMotion || touchLayout ? undefined : { y: -4, transition: getSpring(reducedMotion) }
      }
    >
      <div className="card-shimmer" aria-hidden="true" />

      <div
        ref={coverRef}
        className="exercise-card-cover aspect-card-poster relative cursor-pointer touch-manipulation select-none"
        onClick={touchLayout ? undefined : handleCoverClick}
        onPointerUp={touchLayout ? handleCoverPointerUp : undefined}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label={`${ex.name}${selectionMode ? ' — toque para adicionar ao treino' : touchLayout ? ' — toque para ações' : ''}`}
        aria-expanded={touchLayout ? mobileExpanded || selectionMode : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (touchLayout) {
              if (selectionMode && onTogglePlaylist) onTogglePlaylist(ex);
              else setMobileExpanded(true);
            } else {
              onWatch(ex);
            }
          }
        }}
      >
        <div className="card-media absolute inset-0 overflow-hidden">
          {!imgLoaded && (
            <div className="absolute inset-0 z-0">
              <Skeleton className="w-full h-full rounded-none" />
            </div>
          )}

          <motion.img
            src={imgSrc}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={handleLoad}
            onError={handleError}
            className={`card-cover-img w-full h-full object-cover relative z-10 transition-opacity duration-300 ${
              imgLoaded ? 'opacity-100' : 'opacity-0'
            } ${mobileExpanded ? 'scale-[0.98]' : ''}`}
            style={{ objectPosition: coverObjectPosition }}
            alt={`Capa do exercício ${ex.name}`}
            whileHover={reducedMotion || showPreview || touchLayout ? undefined : { scale: 1.04 }}
            transition={getSpring(reducedMotion)}
          />

          {showPreview && ytId && !touchLayout && (
            <div className="card-preview-player absolute inset-0 z-[15] pointer-events-none">
              <YouTubePlayer
                videoId={ytId}
                title={ex.name}
                autoplay
                mute
                controls={false}
                preferMaxQuality
                isShort={isYouTubeShort(ex.youtubeUrl)}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}

          <div className="card-cover-vignette" aria-hidden="true" />

          {touchLayout && selectionMode && playlistSequence != null && (
            <div className="card-selection-order-mobile" aria-label={`${playlistSequence}º no treino`}>
              {playlistSequence}
            </div>
          )}

          {!showPreview && showCenterPlay && (
            <button
              type="button"
              data-card-play-trigger
              className="card-play-trigger-center"
              onClick={handlePlayClick}
              aria-label={`Reproduzir ${ex.name}`}
            >
              <div className="card-play-ring">
                <Icon name="play" className="w-5 h-5 text-white ml-0.5" />
              </div>
            </button>
          )}

          {!showPreview && !touchLayout && (
            <div
              className="card-play-overlay absolute inset-0 z-[25] flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <div className="card-play-ring">
                <Icon name="play" className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}
        </div>

        <div className="card-top-bar absolute inset-x-0 top-0 z-[60] flex flex-col items-center gap-1.5 px-4 pt-3.5">
          <div className="card-id-row flex items-center justify-center gap-1.5 flex-wrap">
            {!selectionMode && (
              <span className="card-id-badge" title={`Exercício #${ex.id}`}>
                #{ex.id}
              </span>
            )}
            {isAdmin && isExerciseIncomplete(ex.youtubeUrl) && (
              <span className="card-status-badge card-status-badge--warn">Incompleto</span>
            )}
            {playlistSequence != null && !touchLayout && (
              <span className="card-playlist-order" title={`${playlistSequence}º na sequência`}>
                {playlistSequence}
              </span>
            )}
            {playlistSequence != null && touchLayout && selectionMode && (
              <span className="card-playlist-order card-playlist-order--selection" title={`${playlistSequence}º na sequência`}>
                {playlistSequence}º
              </span>
            )}
          </div>

          <div className={`card-action-strip ${showMobileActions ? 'card-action-strip--visible' : ''}`}>
            {selectionMode && onTogglePlaylist ? (
              <button
                type="button"
                data-card-action="playlist"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePlaylist(ex);
                }}
                className={actionBtnClass(isInPlaylist ? 'card-action-btn--active' : '')}
                aria-label={isInPlaylist ? 'Remover do treino' : 'Adicionar ao treino'}
              >
                <Icon name={isInPlaylist ? 'check' : 'plus'} className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                {onToggleFavorite && (
                  <button
                    type="button"
                    data-card-action="favorite"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(ex);
                    }}
                    className={actionBtnClass(isFavorite ? 'card-action-btn--active' : '')}
                    title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                  >
                    <Icon name="heart" className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
                  </button>
                )}

                {onCompare && (
                  <button
                    type="button"
                    data-card-action="compare"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompare(ex);
                    }}
                    className={actionBtnClass(isComparePick ? 'card-action-btn--active' : '')}
                    title="Comparar execuções"
                  >
                    <Icon name="compare" className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  data-card-action="copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyLink(ex.youtubeUrl, ex.firestoreId);
                  }}
                  className={actionBtnClass(
                    copiedId === ex.firestoreId ? 'card-action-btn--success' : ''
                  )}
                  title="Copiar link"
                  aria-label="Copiar link"
                >
                  <Icon name={copiedId === ex.firestoreId ? 'check' : 'copy'} className="w-3.5 h-3.5" />
                </button>

                <div ref={downloadRef} className="relative">
                  <button
                    type="button"
                    data-card-action="download"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDownloadOpen((v) => !v);
                    }}
                    className={actionBtnClass(downloadOpen ? 'card-action-btn--active' : '')}
                    title="Baixar vídeo"
                    aria-label="Baixar vídeo"
                    aria-expanded={downloadOpen}
                  >
                    <Icon name="download" className="w-3.5 h-3.5" />
                  </button>

                  <AnimatePresence>
                    {downloadOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: -4 }}
                        transition={getSpring(reducedMotion)}
                        className="card-download-menu dropdown-panel"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {['4K', '1080p', '720p', '480p'].map((quality) => (
                          <button
                            key={quality}
                            type="button"
                            className="card-download-option"
                            onClick={(e) => {
                              if (quality === '4K') {
                                handleDownloadCheck(e, ex, quality);
                              } else {
                                e.stopPropagation();
                                showToast(`"${ex.name}" em ${quality} estará disponível em breve!`);
                              }
                              setDownloadOpen(false);
                            }}
                          >
                            {quality}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      data-card-action="edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(e);
                      }}
                      className={actionBtnClass('')}
                      title="Editar"
                    >
                      <Icon name="pencil" className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      data-card-action="delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(e);
                      }}
                      className={actionBtnClass('card-action-btn--danger')}
                      title="Excluir"
                    >
                      <Icon name="trash" className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="card-meta-footer">
          <p className="card-meta-category">{ex.category}</p>
          <h3 className="card-meta-title" title={ex.name}>
            {ex.name}
          </h3>
          {touchLayout && mobileExpanded && !selectionMode && (
            <div className="card-mobile-details">
              <MuscleGroupList groups={ex.muscleGroups} compact showTitle />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
