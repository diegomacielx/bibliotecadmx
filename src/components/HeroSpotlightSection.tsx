import { useMemo, useState } from 'react';
import type { Exercise, HeroSpotlightSettings } from '../types';
import { ExerciseCoverImage } from './ExerciseCoverImage';
import { useExerciseCover } from '../hooks/useExerciseCover';
import {
  getCoverFocusX,
  getCoverFocusY,
  parseCoverFocusXInput,
  parseCoverFocusYInput,
  parseCoverZoomInput,
} from '../lib/coverFocus';
import { hasValidYouTubeUrl, normalizeString } from '../lib/utils';
import { Icon } from './Icon';
import { HeroCampaignPanel } from './HeroCampaignPanel';

interface HeroSpotlightSectionProps {
  exercises: Exercise[];
  heroSpotlight: HeroSpotlightSettings;
  onChange: (next: HeroSpotlightSettings) => void;
  onSave: (next: HeroSpotlightSettings) => Promise<void>;
}

export function HeroSpotlightSection({
  exercises,
  heroSpotlight,
  onChange,
  onSave,
}: HeroSpotlightSectionProps) {
  const [saving, setSaving] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const mode = heroSpotlight.mode ?? 'daily';

  const completeExercises = useMemo(
    () => exercises.filter((ex) => hasValidYouTubeUrl(ex.youtubeUrl)),
    [exercises]
  );

  const exercisePickerOptions = useMemo(() => {
    const q = normalizeString(exerciseQuery.trim());
    if (!q) return completeExercises;
    return completeExercises.filter((ex) =>
      normalizeString(`${ex.id} ${ex.name} ${ex.category}`).includes(q)
    );
  }, [completeExercises, exerciseQuery]);

  const selectedExercise = useMemo(
    () => exercises.find((ex) => ex.firestoreId === heroSpotlight.exerciseFirestoreId),
    [exercises, heroSpotlight.exerciseFirestoreId]
  );

  const previewFrame = useMemo(() => {
    if (selectedExercise) {
      return {
        ...selectedExercise,
        coverFocusX: heroSpotlight.coverFocusX ?? selectedExercise.coverFocusX,
        coverFocusY: heroSpotlight.coverFocusY ?? selectedExercise.coverFocusY,
        coverZoom: heroSpotlight.coverZoom ?? selectedExercise.coverZoom,
      };
    }
    return { name: '', category: '', muscleGroups: [] as string[] };
  }, [heroSpotlight, selectedExercise]);

  const coverSource = useMemo(() => {
    if (selectedExercise) {
      return {
        firestoreId: selectedExercise.firestoreId,
        id: selectedExercise.id,
        thumbnail: selectedExercise.thumbnail,
        youtubeUrl: selectedExercise.youtubeUrl,
      };
    }
    return { firestoreId: 'hero-preview', id: '0000', youtubeUrl: '', thumbnail: '' };
  }, [selectedExercise]);

  const { imgSrc, coverMissing, placeholderSrc, webpSrc, handleLoad, handleError } = useExerciseCover(
    coverSource,
    { priority: 'critical' }
  );
  const showCoverPreview = Boolean(imgSrc) || coverMissing;

  const displayY =
    parseCoverFocusYInput(
      heroSpotlight.coverFocusY != null ? String(heroSpotlight.coverFocusY) : ''
    ) ?? getCoverFocusY(previewFrame);
  const displayX =
    parseCoverFocusXInput(
      heroSpotlight.coverFocusX != null ? String(heroSpotlight.coverFocusX) : ''
    ) ?? getCoverFocusX(previewFrame);
  const displayZoom = Math.round(
    (parseCoverZoomInput(
      heroSpotlight.coverZoom != null ? String(Math.round(heroSpotlight.coverZoom * 100)) : ''
    ) ?? previewFrame.coverZoom ?? 1) * 100
  );

  const patch = (next: Partial<HeroSpotlightSettings>) => onChange({ ...heroSpotlight, ...next });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(heroSpotlight);
    } finally {
      setSaving(false);
    }
  };

  const showExerciseFraming = mode === 'daily' || mode === 'exercise';

  return (
    <section className="admin-hero-spotlight">
      <header className="admin-section-head">
        <h3 className="admin-section-title">Destaque do dia / Campanhas</h3>
        <p className="admin-hint">
          Sorteio diário, exercício fixo ou múltiplas campanhas patrocinadas com agendamento, fila e
          métricas. Capa em <strong>16:9</strong> (ex.: 1920×1080).
        </p>
      </header>

      <div className="admin-cover-mode admin-hero-mode">
        {(['daily', 'exercise', 'campaign'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`admin-cover-mode-btn ${mode === item ? 'admin-cover-mode-btn--active' : ''}`}
            onClick={() => patch({ mode: item })}
          >
            {item === 'daily'
              ? 'Sorteio diário'
              : item === 'exercise'
                ? 'Exercício fixo'
                : 'Campanhas / ads'}
          </button>
        ))}
      </div>

      {mode === 'exercise' && (
        <div className="admin-form-grid admin-form-grid--hero-exercise">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Buscar exercício</span>
            <input
              type="search"
              className="admin-input"
              placeholder="Nome, ID ou categoria…"
              value={exerciseQuery}
              onChange={(e) => setExerciseQuery(e.target.value)}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span className="admin-label">Exercício</span>
            <div className="admin-select-wrap">
              <select
                className="admin-input"
                value={heroSpotlight.exerciseFirestoreId || ''}
                onChange={(e) => patch({ exerciseFirestoreId: e.target.value || undefined })}
              >
                <option value="">Selecione…</option>
                {exercisePickerOptions.map((ex) => (
                  <option key={ex.firestoreId} value={ex.firestoreId}>
                    #{ex.id} — {ex.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="admin-hint">
              {exercisePickerOptions.length} de {completeExercises.length} exercícios com YouTube válido
            </p>
          </label>
        </div>
      )}

      {mode === 'campaign' && (
        <HeroCampaignPanel heroSpotlight={heroSpotlight} onChange={onChange} />
      )}

      {showExerciseFraming && (
        <div className="admin-cover-focus admin-hero-cover-focus">
          <div
            className="admin-cover-preview admin-cover-preview--hero hero-cover-wrap card-catalog-cover"
            aria-hidden="true"
          >
            {showCoverPreview ? (
              <ExerciseCoverImage
                imgSrc={imgSrc}
                imgLoaded
                placeholderSrc={placeholderSrc}
                webpSrc={webpSrc}
                alt=""
                coverMissing={coverMissing}
                exerciseId={selectedExercise?.id}
                exerciseCategory={selectedExercise?.category}
                frameSource={{
                  ...previewFrame,
                  coverFocusX: displayX,
                  coverFocusY: displayY,
                  coverZoom: displayZoom / 100,
                }}
                useBlurUp={false}
                onLoad={handleLoad}
                onError={handleError}
                imgClassName="card-cover-img"
              />
            ) : (
              <div className="admin-cover-preview-empty">
                {mode === 'exercise' ? 'Selecione um exercício' : 'Preview do sorteio diário (exemplo)'}
              </div>
            )}
            <span className="admin-cover-preview-badge">
              16:9 · {displayX}% · {displayY}% · {displayZoom}%
            </span>
          </div>

          <div className="admin-cover-controls">
            <label className="admin-cover-slider-label">
              <span>Foco vertical (Y)</span>
              <span className="admin-cover-slider-value">{displayY}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={displayY}
              className="admin-cover-slider"
              onChange={(e) => patch({ coverFocusY: Number(e.target.value) })}
            />
            <label className="admin-cover-slider-label">
              <span>Foco horizontal (X)</span>
              <span className="admin-cover-slider-value">{displayX}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={displayX}
              className="admin-cover-slider"
              onChange={(e) => patch({ coverFocusX: Number(e.target.value) })}
            />
            <label className="admin-cover-slider-label">
              <span>Zoom</span>
              <span className="admin-cover-slider-value">{displayZoom}%</span>
            </label>
            <input
              type="range"
              min={75}
              max={160}
              value={displayZoom}
              className="admin-cover-slider"
              onChange={(e) => patch({ coverZoom: Number(e.target.value) / 100 })}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className="admin-btn admin-btn--primary admin-hero-save"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? <Icon name="loader" className="w-4 h-4 animate-spin" /> : <Icon name="save" className="w-4 h-4" />}
        {saving ? 'Salvando…' : 'Salvar destaque'}
      </button>
    </section>
  );
}
