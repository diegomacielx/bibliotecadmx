import { memo } from 'react';
import type { Exercise, ExerciseForm, AdminTab } from '../../types';
import type { MobileCatalogView } from '../../lib/mobilePreferences';
import type { PlaylistSelectionLookup } from '../../lib/playlistSelection';
import { getPlaylistSequence } from '../../lib/playlistSelection';
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
  playlistSelection: PlaylistSelectionLookup;
  onTogglePlaylist: (ex: Exercise) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavoriteExercise: (ex: Exercise) => void;
  onCompare?: (ex: Exercise) => void;
  comparePickId?: string;
  cardHoverPreview: boolean;
  cardCoverParallax: boolean;
}

export const MobileCatalog = memo(function MobileCatalog({
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
  playlistSelection,
  onTogglePlaylist,
  isFavorite,
  onToggleFavoriteExercise,
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
            isInPlaylist={playlistSelection.ids.has(ex.firestoreId)}
            playlistSequence={getPlaylistSequence(playlistSelection, ex.firestoreId, selectionMode)}
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
          isInPlaylist={playlistSelection.ids.has(ex.firestoreId)}
          playlistSequence={getPlaylistSequence(playlistSelection, ex.firestoreId, selectionMode)}
          onTogglePlaylist={onTogglePlaylist}
          isFavorite={isFavorite(ex.firestoreId)}
          onToggleFavorite={onToggleFavoriteExercise}
          onCompare={onCompare}
          isComparePick={comparePickId === ex.firestoreId}
          prefetchPeers={getGridPrefetchPeers(exercises, index)}
          hoverPreviewEnabled={cardHoverPreview}
          coverParallaxEnabled={cardCoverParallax}
        />
      ))}
    </div>
  );
});
