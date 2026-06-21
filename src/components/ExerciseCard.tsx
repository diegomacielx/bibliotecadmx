import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Exercise, ExerciseForm, AdminTab } from '../types';
import {
  getDbPath,
} from '../lib/utils';
import { deleteDoc, fbDoc, db } from '../lib/firebase';
import { useAmbientGlow } from '../hooks/useMousePosition';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTilt3D } from '../hooks/useTilt3D';
import { useExerciseCover } from '../hooks/useExerciseCover';
import { getSpring, staggerItem } from '../lib/motion';
import {
  formatCoverFocusYInput,
  formatCoverFocusXInput,
  formatCoverZoomInput,
  isCoverFramingManual,
} from '../lib/coverFocus';
import { useTouchLayout, useMediaQuery } from '../hooks/useMediaQuery';
import { useCardPreviewHover } from '../hooks/useCardPreviewHover';
import { ExerciseCoverImage } from './ExerciseCoverImage';
import { Icon } from './Icon';
import { CardVideoPreview } from './CardVideoPreview';
import { prefetchExerciseHoverBundle } from '../lib/exercisePrefetch';
import { primeVideoPlaybackIntent } from '../lib/videoPlaybackPrime';
import { MobileExerciseCardMenu } from './mobile/MobileExerciseCardMenu';
import {
  CARD_PREVIEW_HOVER_DELAY_MS,
  isCardPreviewVertical,
  resolveCardPreviewVideoUrl,
  warmCardPreviewVideo,
} from '../lib/cardPreview';

interface ExerciseCardProps {
  ex: Exercise;
  index: number;
  isAdmin: boolean;
  isExerciseIncomplete: (url: string) => boolean;
  handleDownloadCheck: (e: React.MouseEvent, ex: Exercise) => void;
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
  prefetchPeers?: Exercise[];
  /** Preview de vídeo ao passar o mouse (desktop). Padrão: ligado. */
  hoverPreviewEnabled?: boolean;
  /** Parallax 3D + deslocamento da capa no hover. Padrão: ligado. */
  coverParallaxEnabled?: boolean;
}

export function ExerciseCard({
  ex,
  index,
  isAdmin,
  isExerciseIncomplete,
  handleDownloadCheck,
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
  prefetchPeers = [],
  hoverPreviewEnabled = true,
  coverParallaxEnabled = true,
}: ExerciseCardProps) {
  const touchLayout = useTouchLayout();
  // Gate robusto: depende só da capacidade de hover do dispositivo (mouse/touchpad),
  // independente de largura de tela, zoom do navegador ou prefers-reduced-motion.
  const hoverDevice = useMediaQuery('(hover: hover)');
  const coverRef = useRef<HTMLDivElement>(null);
  const coverPriority = index < 8 ? 'critical' : index < 24 ? 'high' : 'normal';
  const coverLoading = index < 12 ? 'eager' : 'lazy';
  const coverFetchPriority = index < 12 ? 'high' : 'auto';

  const { imgSrc, imgLoaded, isCoverInstant, coverMissing, placeholderSrc, webpSrc, handleLoad, handleError } =
    useExerciseCover(ex, { priority: coverPriority });
  const handleGlow = useAmbientGlow<HTMLDivElement>();
  const reducedMotion = useReducedMotion();
  const desktopEffects = hoverDevice;
  const canPreview = hoverDevice && hoverPreviewEnabled;
  const showMobileActions = touchLayout && selectionMode && isAdmin;
  const showCenterPlay = false;
  const touchCatalogLayout = touchLayout && !selectionMode;
  const [showPreview, setShowPreview] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const cardHoveredRef = useRef(false);
  const coverMotionEnabled = desktopEffects && coverParallaxEnabled;
  const tiltEnabled = coverMotionEnabled && !showPreview && !previewSrc;
  const activatePreview = useCallback(() => {
    if (!cardHoveredRef.current) return;
    setShowPreview(true);
  }, []);

  const deactivatePreview = useCallback(() => {
    setShowPreview(false);
    setPreviewSrc(null);
    setPreviewPlaying(false);
  }, []);

  const startPreviewWarmup = useCallback(() => {
    const url = resolveCardPreviewVideoUrl(ex);
    warmCardPreviewVideo(url);
    setPreviewSrc(url);
  }, [ex]);

  const handlePreviewError = useCallback(() => {
    deactivatePreview();
  }, [deactivatePreview]);

  const { onMouseEnter: previewMouseEnter, onMouseLeave: previewMouseLeave } = useCardPreviewHover({
    enabled: canPreview,
    delayMs: CARD_PREVIEW_HOVER_DELAY_MS,
    onActivate: activatePreview,
    onDeactivate: deactivatePreview,
    onHoverStart: () => {
      startPreviewWarmup();
      if (!touchLayout) {
        primeVideoPlaybackIntent(ex);
        prefetchExerciseHoverBundle(ex, prefetchPeers);
      }
    },
  });

  const handlePreviewPlaying = useCallback(() => {
    setPreviewPlaying(true);
  }, []);

  const tilt = useTilt3D(6, tiltEnabled);

  const resetCoverMotion = useCallback(() => {
    const el = tilt.ref.current;
    if (!el || !coverMotionEnabled) return;
    el.style.setProperty('--parallax-x', '0');
    el.style.setProperty('--parallax-y', '0');
    el.style.setProperty('--mouse-x', '50%');
    el.style.setProperty('--mouse-y', '50%');
  }, [coverMotionEnabled, tilt.ref]);

  const handleCardMouseEnter = useCallback(() => {
    cardHoveredRef.current = true;
    if (canPreview) previewMouseEnter();
  }, [canPreview, previewMouseEnter]);

  const handleCardMouseLeave = useCallback(() => {
    cardHoveredRef.current = false;
    if (canPreview) previewMouseLeave();
    resetCoverMotion();
    if (tiltEnabled) tilt.onMouseLeave();
  }, [canPreview, previewMouseLeave, resetCoverMotion, tiltEnabled, tilt]);

  useEffect(() => {
    if (hoverPreviewEnabled) return;
    cardHoveredRef.current = false;
    deactivatePreview();
  }, [hoverPreviewEnabled, deactivatePreview]);

  useEffect(() => {
    if (coverParallaxEnabled) return;
    resetCoverMotion();
    if (tiltEnabled) tilt.onMouseLeave();
  }, [coverParallaxEnabled, resetCoverMotion, tiltEnabled, tilt]);

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
      equipment: Array.isArray(ex.equipment) ? [...ex.equipment] : [],
      youtubeUrl: ex.youtubeUrl || '',
      thumbnail: ex.thumbnail || '',
      hasCloudVideo: ex.hasCloudVideo,
      coverFocusY: formatCoverFocusYInput(ex.coverFocusY),
      coverFocusX: formatCoverFocusXInput(ex.coverFocusX),
      coverZoom: formatCoverZoomInput(ex.coverZoom),
      coverFramingManual: isCoverFramingManual(ex),
    });
    setEditingId(ex.firestoreId);
    setAdminTab('single');
    setShowAdminPanel(true);
  };

  const handleCoverPointerDown = (e: React.PointerEvent) => {
    if (touchLayout) {
      if (selectionMode) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      return;
    }
    if (e.button !== 0) return;
    primeVideoPlaybackIntent(ex);
  };

  const handleCoverActivate = (e: React.SyntheticEvent) => {
    if ((e.target as HTMLElement).closest('[data-card-play-trigger]')) return;
    if ((e.target as HTMLElement).closest('[data-card-action]')) return;

    if (touchLayout) {
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
    deactivatePreview();
    primeVideoPlaybackIntent(ex);
    onWatch(ex);
  };

  const handleCoverClick = (e: React.MouseEvent) => {
    handleCoverActivate(e);
  };

  const handleCoverPointerUp = (e: React.PointerEvent) => {
    if (!touchLayout) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-card-action]')) return;

    if (selectionMode && onTogglePlaylist) {
      e.stopPropagation();
      e.preventDefault();
      onTogglePlaylist(ex);
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    deactivatePreview();
    primeVideoPlaybackIntent(ex);
    onWatch(ex);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    primeVideoPlaybackIntent(ex);
    onWatch(ex);
  };

  const actionBtnClass = (extra = '') => `card-action-btn cursor-pointer ${extra}`.trim();

  return (
    <motion.div
      ref={tilt.ref}
      variants={staggerItem}
      custom={index}
      layout={false}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      onMouseMove={(e) => {
        if (coverMotionEnabled) handleGlow(e);
        if (tiltEnabled) tilt.onMouseMove(e);
      }}
      style={
        tiltEnabled
          ? {
              rotateX: tilt.rotateX,
              rotateY: tilt.rotateY,
              transformPerspective: 900,
            }
          : undefined
      }
      className={`exercise-card cinematic-card card-grid-item card-3d group relative rounded-cinema-lg border shadow-cinematic hover:shadow-cinematic ease-cinematic duration-cinematic ${
        coverMissing ? 'exercise-card--no-cover' : ''
      } ${showPreview ? 'exercise-card--preview-active' : ''} ${previewSrc && !showPreview ? 'exercise-card--preview-warming' : ''} ${
        isAdmin ? 'exercise-card--admin' : ''
      } ${selectionMode ? 'card-actions-pinned z-[50]' : 'z-10'} ${
        selectionMode ? 'card-selection-mode' : ''} ${
        touchCatalogLayout ? 'exercise-card--touch-catalog' : ''
      } ${
        isComparePick
          ? 'border-red-500 ring-2 ring-red-500/40'
          : isInPlaylist
            ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
            : 'border-transparent hover:border-white/10'
      } focus-within:outline-none`}
      whileHover={
        tiltEnabled ? { y: -4, transition: getSpring(reducedMotion) } : undefined
      }
    >
      <div className="card-shimmer" aria-hidden="true" />

      <div
        ref={coverRef}
        className="exercise-card-cover card-catalog-cover aspect-card-poster relative cursor-pointer touch-manipulation select-none focus:outline-none"
        onClick={touchLayout ? undefined : handleCoverClick}
        onPointerDown={handleCoverPointerDown}
        onPointerUp={touchLayout ? handleCoverPointerUp : undefined}
        onContextMenu={(e) => e.preventDefault()}
        role="button"
        tabIndex={0}
        aria-label={`${ex.name}${selectionMode ? ' — toque para adicionar ao treino' : touchLayout ? ' — toque para abrir' : ''}`}
        aria-expanded={touchLayout ? selectionMode : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (touchLayout) {
              if (selectionMode && onTogglePlaylist) onTogglePlaylist(ex);
              else {
                primeVideoPlaybackIntent(ex);
                onWatch(ex);
              }
            } else {
              onWatch(ex);
            }
          }
        }}
      >
        <div
          className={`card-media card-catalog-media absolute inset-0 overflow-hidden ${
            previewPlaying ? 'card-media--previewing' : ''
          }`}
        >
          <ExerciseCoverImage
            imgSrc={imgSrc}
            imgLoaded={imgLoaded}
            placeholderSrc={placeholderSrc}
            webpSrc={webpSrc}
            alt={`Capa do exercício ${ex.name}`}
            frameSource={ex}
            exerciseId={ex.id}
            exerciseCategory={ex.category}
            instantDisplay={isCoverInstant}
            coverMissing={coverMissing}
            loading={coverLoading}
            fetchPriority={coverFetchPriority}
            useBlurUp={false}
            onLoad={handleLoad}
            onError={handleError}
            imgClassName="card-cover-img"
          />

          {!coverMissing && <div className="card-cover-grain" aria-hidden="true" />}

          {!coverMissing && <div className="card-cover-vignette" aria-hidden="true" />}

          {touchLayout && selectionMode && playlistSequence != null && (
            <div className="card-selection-order-mobile" aria-label={`${playlistSequence}º no treino`}>
              {playlistSequence}
            </div>
          )}

          {!showPreview && !previewPlaying && showCenterPlay && (
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

          {!coverMissing && !showPreview && !touchLayout && (
            <div
              className="card-play-overlay absolute inset-0 z-[25] flex items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <div className="card-play-ring">
                <Icon name="play" className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          )}

          {previewSrc && (
            <CardVideoPreview
              src={previewSrc}
              title={ex.name}
              revealed={showPreview}
              isVertical={isCardPreviewVertical(ex)}
              onPlaying={handlePreviewPlaying}
              onError={handlePreviewError}
            />
          )}
        </div>

        <div className={`card-top-bar absolute inset-x-0 top-0 z-[60] flex flex-col items-center gap-1.5 px-4 pt-3.5 ${touchCatalogLayout ? 'card-top-bar--touch-hidden' : ''}`}>
          <div className="card-id-row flex items-center justify-center gap-1.5 flex-wrap">
            {!selectionMode && !touchLayout && (
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

                {onCompare && !touchLayout && (
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

                <button
                  type="button"
                  data-card-action="download"
                  onClick={(e) => handleDownloadCheck(e, ex)}
                  className={actionBtnClass('')}
                  title="Baixar 4K"
                  aria-label="Baixar 4K"
                >
                  <Icon name="download" className="w-3.5 h-3.5" />
                </button>

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

        <div className={`card-meta-footer ${touchCatalogLayout ? 'card-meta-footer--touch-top' : ''}`}>
          {!touchLayout && <p className="card-meta-category">{ex.category}</p>}
          <h3 className="card-meta-title" title={ex.name}>
            {ex.name}
          </h3>
        </div>

        {touchCatalogLayout && !selectionMode && (
          <MobileExerciseCardMenu
            variant="grid"
            onDownload={(e) => handleDownloadCheck(e, ex)}
            onCopyLink={(e) => {
              e.stopPropagation();
              copyLink(ex.youtubeUrl, ex.firestoreId);
            }}
            copied={copiedId === ex.firestoreId}
            onEdit={isAdmin ? handleEdit : undefined}
            onDelete={isAdmin ? (e) => void handleDelete(e) : undefined}
          />
        )}
      </div>
    </motion.div>
  );
}
