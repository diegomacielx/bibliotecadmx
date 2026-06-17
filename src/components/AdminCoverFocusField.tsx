import { useMemo } from 'react';
import type { ExerciseForm } from '../types';
import { CUSTOM_LOGO_URL } from '../lib/constants';
import {
  getCoverFocusY,
  parseCoverFocusYInput,
} from '../lib/coverFocus';
import { buildExerciseImageFallbacks, parseCommaList } from '../lib/utils';

interface AdminCoverFocusFieldProps {
  form: ExerciseForm;
  setForm: (form: ExerciseForm) => void;
  editingFirestoreId?: string | null;
}

export function AdminCoverFocusField({
  form,
  setForm,
  editingFirestoreId,
}: AdminCoverFocusFieldProps) {
  const isManual = form.coverFocusY.trim() !== '';

  const draftExercise = useMemo(
    () => ({
      name: form.name,
      category: form.category,
      muscleGroups: parseCommaList(form.muscleGroups),
      keywords: parseCommaList(form.keywords),
    }),
    [form.name, form.category, form.muscleGroups, form.keywords]
  );

  const autoFocusY = useMemo(() => getCoverFocusY(draftExercise), [draftExercise]);

  const displayFocusY = isManual
    ? (parseCoverFocusYInput(form.coverFocusY) ?? autoFocusY)
    : autoFocusY;

  const previewSrc = useMemo(() => {
    const urls = buildExerciseImageFallbacks({
      firestoreId: editingFirestoreId || undefined,
      id: form.id || '0000',
      thumbnail: form.thumbnail,
      youtubeUrl: form.youtubeUrl,
    });
    return urls[0] || CUSTOM_LOGO_URL;
  }, [editingFirestoreId, form.id, form.thumbnail, form.youtubeUrl]);

  const setFocusY = (y: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(y)));
    setForm({ ...form, coverFocusY: String(clamped) });
  };

  return (
    <div className="admin-cover-focus">
      <div className="admin-cover-preview" aria-hidden="true">
        <img
          src={previewSrc}
          alt=""
          className="admin-cover-preview-img"
          style={{ objectPosition: `center ${displayFocusY}%` }}
        />
        <div
          className="admin-cover-preview-guide"
          style={{ top: `${displayFocusY}%` }}
        />
        <span className="admin-cover-preview-badge">{displayFocusY}%</span>
      </div>

      <div className="admin-cover-controls">
        <div className="admin-cover-mode">
          <button
            type="button"
            className={`admin-cover-mode-btn ${!isManual ? 'admin-cover-mode-btn--active' : ''}`}
            onClick={() => setForm({ ...form, coverFocusY: '' })}
          >
            Automático
            <span className="admin-cover-mode-value">{autoFocusY}%</span>
          </button>
          <button
            type="button"
            className={`admin-cover-mode-btn ${isManual ? 'admin-cover-mode-btn--active' : ''}`}
            onClick={() => setForm({ ...form, coverFocusY: String(displayFocusY) })}
          >
            Manual
          </button>
        </div>

        <label className="admin-cover-slider-label">
          <span>Foco vertical</span>
          <span className="admin-cover-slider-value">{displayFocusY}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={displayFocusY}
          className="admin-cover-slider"
          onChange={(e) => setFocusY(Number(e.target.value))}
        />
        <div className="admin-cover-slider-hints">
          <span>Topo</span>
          <span>Centro</span>
          <span>Base</span>
        </div>

        <p className="admin-hint admin-cover-hint">
          {isManual
            ? 'Ajuste manual ativo — salve para aplicar nos cards e no destaque.'
            : 'Heurística por nome, categoria e músculos. Ative Manual ou arraste o slider para corrigir capas específicas.'}
        </p>
      </div>
    </div>
  );
}
