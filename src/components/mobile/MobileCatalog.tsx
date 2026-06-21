import type { Exercise, ExerciseForm, AdminTab } from '../../types';
import type { MobileCatalogView } from '../../lib/mobilePreferences';
import { ExerciseCard } from '../ExerciseCard';
import { MobileExerciseListRow } from './MobileExerciseListRow';
import { getGridPrefetchPeers } from '../../lib/exercisePrefetch';

interface MobileCatalogProps {
  exercises: Exercise[];
  catalogView: MobileCatalogView;
  isAdmin: boolean;
  isExerciseIncomplete: (url: string) => boolean;
  handleDownloadCheck: (e: React.MouseEvent, ex: Exercise) => Promise<void>;
  setForm: (form: ExerciseForm) => void;
  setEditingId: (id: string | null) => void;
  setAdminTab: (tab: AdminTab) => void;
  setShowAdminPanel: (show: boolean) => void;
  copyLink: (url: string, firestoreId: string) => void;
  copiedId: string | null;
  onWatch: (ex: Exercise) => void;
  selectionMode: boolean;
  playlistOrder: string[];
  onTogglePlaylist: (ex: Exercise) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onCompare?: (ex: Exercise) => void;
  comparePickId?: string;
  cardHoverPreview: boolean;
  cardCoverParallax: boolean;
}

export function MobileCatalog({
  exercises,
  catalogView,
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
  selectionMode,
  playlistOrder,
  onTogglePlaylist,
  isFavorite,
  onToggleFavorite,
  onCompare,
  comparePickId,
  cardHoverPreview,
  cardCoverParallax,
}: MobileCatalogProps) {
  if (catalogView === 'list') {
    return (
      <div className="mobile-catalog-list">
        {exercises.map((ex, index) => (
          <MobileExerciseListRow
            key={ex.firestoreId}
            ex={ex}
            index={index}
            onWatch={onWatch}
            onDownload={handleDownloadCheck}
            onCopyLink={() => copyLink(ex.youtubeUrl, ex.firestoreId)}
            copied={copiedId === ex.firestoreId}
            selectionMode={selectionMode}
            onTogglePlaylist={onTogglePlaylist}
            isInPlaylist={playlistOrder.includes(ex.firestoreId)}
            playlistSequence={
              selectionMode
                ? playlistOrder.indexOf(ex.firestoreId) >= 0
                  ? playlistOrder.indexOf(ex.firestoreId) + 1
                  : undefined
                : undefined
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-fluid-md">
      {exercises.map((ex, index) => (
        <ExerciseCard
          key={ex.firestoreId}
          ex={ex}
          index={index}
          isAdmin={isAdmin}
          isExerciseIncomplete={isExerciseIncomplete}
          handleDownloadCheck={handleDownloadCheck}
          setForm={setForm}
          setEditingId={setEditingId}
          setAdminTab={setAdminTab}
          setShowAdminPanel={setShowAdminPanel}
          copyLink={copyLink}
          copiedId={copiedId}
          onWatch={onWatch}
          selectionMode={selectionMode}
          isInPlaylist={playlistOrder.includes(ex.firestoreId)}
          playlistSequence={
            selectionMode
              ? playlistOrder.indexOf(ex.firestoreId) >= 0
                ? playlistOrder.indexOf(ex.firestoreId) + 1
                : undefined
              : undefined
          }
          onTogglePlaylist={onTogglePlaylist}
          isFavorite={isFavorite(ex.firestoreId)}
          onToggleFavorite={() => onToggleFavorite(ex.firestoreId)}
          onCompare={onCompare}
          isComparePick={comparePickId === ex.firestoreId}
          prefetchPeers={getGridPrefetchPeers(exercises, index)}
          hoverPreviewEnabled={cardHoverPreview}
          coverParallaxEnabled={cardCoverParallax}
        />
      ))}
    </div>
  );
}
