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
import { Icon } from './Icon';

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
  const mode = heroSpotlight.mode ?? 'daily';

  const selectedExercise = useMemo(
    () => exercises.find((ex) => ex.firestoreId === heroSpotlight.exerciseFirestoreId),
    [exercises, heroSpotlight.exerciseFirestoreId]
  );

  const previewFrame = useMemo(() => {
    if (mode === 'campaign') {
      return {
        name: heroSpotlight.title || 'Outdoor',
        category: heroSpotlight.categoryLabel || '',
        muscleGroups: [] as string[],
        coverFocusX: heroSpotlight.coverFocusX,
        coverFocusY: heroSpotlight.coverFocusY,
        coverZoom: heroSpotlight.coverZoom,
      };
    }
    if (selectedExercise) {
      return {
        ...selectedExercise,
        coverFocusX: heroSpotlight.coverFocusX ?? selectedExercise.coverFocusX,
        coverFocusY: heroSpotlight.coverFocusY ?? selectedExercise.coverFocusY,
        coverZoom: heroSpotlight.coverZoom ?? selectedExercise.coverZoom,
      };
    }
    return { name: '', category: '', muscleGroups: [] as string[] };
  }, [mode, heroSpotlight, selectedExercise]);

  const coverSource = useMemo(() => {
    if (mode === 'campaign') {
      return {
        firestoreId: 'hero-campaign-preview',
        id: 'hero',
        thumbnail: heroSpotlight.imageUrl,
        youtubeUrl: '',
      };
    }
    if (selectedExercise) {
      return {
        firestoreId: selectedExercise.firestoreId,
        id: selectedExercise.id,
        thumbnail: selectedExercise.thumbnail,
        youtubeUrl: selectedExercise.youtubeUrl,
      };
    }
    return { firestoreId: 'hero-preview', id: '0000', youtubeUrl: '', thumbnail: '' };
  }, [mode, heroSpotlight.imageUrl, selectedExercise]);

  const { imgSrc, placeholderSrc, webpSrc, handleLoad, handleError } = useExerciseCover(coverSource);
  const previewSrc = mode === 'campaign' ? heroSpotlight.imageUrl || imgSrc : imgSrc;

  const displayY =
    parseCoverFocusYInput(
      heroSpotlight.coverFocusY != null ? String(heroSpotlight.coverFocusY) : ''
    ) ?? getCoverFocusY(previewFrame);
  const displayX =
    parseCoverFocusXInput(
      heroSpotlight.coverFocusX != null ? String(heroSpotlight.coverFocusX) : ''
    ) ?? getCoverFocusX(previewFrame);
  const displayZoom = Math.round((parseCoverZoomInput(
    heroSpotlight.coverZoom != null ? String(Math.round(heroSpotlight.coverZoom * 100)) : ''
  ) ?? previewFrame.coverZoom ?? 1) * 100);

  const patch = (next: Partial<HeroSpotlightSettings>) => onChange({ ...heroSpotlight, ...next });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(heroSpotlight);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-hero-spotlight">
      <header className="admin-section-head">
        <h3 className="admin-section-title">Destaque do dia / Outdoor</h3>
        <p className="admin-hint">
          Sorteio diário, exercício fixo ou campanha com imagem externa (URL pública, GCS, GitHub…).
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
            {item === 'daily' ? 'Sorteio diário' : item === 'exercise' ? 'Exercício fixo' : 'Outdoor / campanha'}
          </button>
        ))}
      </div>

      {mode === 'exercise' && (
        <label className="admin-field admin-field--full">
          <span className="admin-label">Exercício</span>
          <div className="admin-select-wrap">
            <select
              className="admin-input"
              value={heroSpotlight.exerciseFirestoreId || ''}
              onChange={(e) => patch({ exerciseFirestoreId: e.target.value || undefined })}
            >
              <option value="">Selecione…</option>
              {exercises.map((ex) => (
                <option key={ex.firestoreId} value={ex.firestoreId}>
                  #{ex.id} — {ex.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      )}

      {mode === 'campaign' && (
        <div className="admin-form-grid admin-form-grid--hero-campaign">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Imagem (URL pública)</span>
            <input
              className="admin-input"
              placeholder="https://storage.googleapis.com/… ou link externo"
              value={heroSpotlight.imageUrl || ''}
              onChange={(e) => patch({ imageUrl: e.target.value })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span className="admin-label">Título</span>
            <input
              className="admin-input"
              value={heroSpotlight.title || ''}
              onChange={(e) => patch({ title: e.target.value })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span className="admin-label">Subtítulo (opcional)</span>
            <input
              className="admin-input"
              value={heroSpotlight.subtitle || ''}
              onChange={(e) => patch({ subtitle: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Categoria / tag</span>
            <input
              className="admin-input"
              value={heroSpotlight.categoryLabel || ''}
              onChange={(e) => patch({ categoryLabel: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Texto do botão</span>
            <input
              className="admin-input"
              placeholder="Saiba mais"
              value={heroSpotlight.ctaLabel || ''}
              onChange={(e) => patch({ ctaLabel: e.target.value })}
            />
          </label>
          <label className="admin-field admin-field--full">
            <span className="admin-label">Link ao clicar</span>
            <input
              className="admin-input"
              placeholder="https://…"
              value={heroSpotlight.linkUrl || ''}
              onChange={(e) => patch({ linkUrl: e.target.value })}
            />
          </label>
        </div>
      )}

      <div className="admin-cover-focus admin-hero-cover-focus">
        <div className="admin-cover-preview admin-cover-preview--live admin-cover-preview--hero" aria-hidden="true">
          {previewSrc ? (
            <ExerciseCoverImage
              imgSrc={previewSrc}
              imgLoaded
              placeholderSrc={mode === 'campaign' ? null : placeholderSrc}
              webpSrc={mode === 'campaign' ? null : webpSrc}
              alt=""
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
            <div className="admin-cover-preview-empty">Selecione imagem ou exercício</div>
          )}
          <span className="admin-cover-preview-badge">
            {displayX}% · {displayY}% · {displayZoom}%
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

      <button
        type="button"
        className="admin-btn admin-btn--primary"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? <Icon name="loader" className="w-4 h-4 animate-spin" /> : <Icon name="save" className="w-4 h-4" />}
        {saving ? 'Salvando…' : 'Salvar destaque'}
      </button>
    </section>
  );
}
