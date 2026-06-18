import { useMemo } from 'react';
import type { Exercise, ExerciseForm } from '../types';
import { CUSTOM_LOGO_URL } from '../lib/constants';
import {
  getCoverFocusY,
  parseCoverFocusXInput,
  parseCoverFocusYInput,
  parseCoverZoomInput,
} from '../lib/coverFocus';
import { buildExerciseImageFallbacks, parseCommaList } from '../lib/utils';
import { ExerciseCoverImage } from './ExerciseCoverImage';
import { useExerciseCover } from '../hooks/useExerciseCover';

interface AdminCoverEditorProps {
  form: ExerciseForm;
  setForm: (form: ExerciseForm) => void;
  editingFirestoreId?: string | null;
}

export function AdminCoverEditor({ form, setForm, editingFirestoreId }: AdminCoverEditorProps) {
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
  const autoFocusX = 50;
  const autoZoom = 100;

  const displayFocusY = form.coverFramingManual
    ? (parseCoverFocusYInput(form.coverFocusY) ?? autoFocusY)
    : autoFocusY;
  const displayFocusX = form.coverFramingManual
    ? (parseCoverFocusXInput(form.coverFocusX) ?? autoFocusX)
    : autoFocusX;
  const displayZoom = form.coverFramingManual
    ? (parseCoverZoomInput(form.coverZoom) != null
        ? Math.round((parseCoverZoomInput(form.coverZoom) ?? 1) * 100)
        : autoZoom)
    : autoZoom;

  const previewExercise = useMemo(
    (): Exercise => ({
      firestoreId: editingFirestoreId || 'preview',
      id: form.id || '0000',
      name: form.name || 'Preview',
      category: form.category,
      muscleGroups: parseCommaList(form.muscleGroups),
      youtubeUrl: form.youtubeUrl,
      thumbnail: form.thumbnail,
      keywords: parseCommaList(form.keywords),
      coverFocusY: form.coverFramingManual ? displayFocusY : undefined,
      coverFocusX: form.coverFramingManual ? displayFocusX : undefined,
      coverZoom: form.coverFramingManual ? displayZoom / 100 : undefined,
    }),
    [
      editingFirestoreId,
      form.id,
      form.name,
      form.category,
      form.muscleGroups,
      form.youtubeUrl,
      form.thumbnail,
      form.keywords,
      form.coverFramingManual,
      displayFocusY,
      displayFocusX,
      displayZoom,
    ]
  );

  const coverSource = useMemo(
    () => ({
      firestoreId: editingFirestoreId || 'preview',
      id: form.id || '0000',
      thumbnail: form.thumbnail,
      youtubeUrl: form.youtubeUrl,
    }),
    [editingFirestoreId, form.id, form.thumbnail, form.youtubeUrl]
  );

  const { imgSrc, placeholderSrc, webpSrc, handleLoad, handleError } = useExerciseCover(coverSource);

  const previewSrc = useMemo(() => {
    const urls = buildExerciseImageFallbacks(coverSource);
    return urls[0] || CUSTOM_LOGO_URL;
  }, [coverSource]);

  const enableManual = () => {
    setForm({
      ...form,
      coverFramingManual: true,
      coverFocusY: String(displayFocusY),
      coverFocusX: String(displayFocusX),
      coverZoom: String(displayZoom),
    });
  };

  const setManualField = (patch: Partial<Pick<ExerciseForm, 'coverFocusX' | 'coverFocusY' | 'coverZoom'>>) => {
    setForm({
      ...form,
      coverFramingManual: true,
      coverFocusY: patch.coverFocusY ?? (form.coverFocusY || String(displayFocusY)),
      coverFocusX: patch.coverFocusX ?? (form.coverFocusX || String(displayFocusX)),
      coverZoom: patch.coverZoom ?? (form.coverZoom || String(displayZoom)),
    });
  };

  const setFocusY = (y: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(y)));
    setManualField({ coverFocusY: String(clamped) });
  };

  const setFocusX = (x: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(x)));
    setManualField({ coverFocusX: String(clamped) });
  };

  const setZoom = (percent: number) => {
    const clamped = Math.min(160, Math.max(75, Math.round(percent)));
    setManualField({ coverZoom: String(clamped) });
  };

  return (
    <div className="admin-cover-focus">
      <div className="admin-cover-preview admin-cover-preview--live" aria-hidden="true">
        <ExerciseCoverImage
          imgSrc={imgSrc || previewSrc}
          imgLoaded
          placeholderSrc={placeholderSrc}
          webpSrc={webpSrc}
          alt=""
          frameSource={previewExercise}
          useBlurUp={false}
          onLoad={handleLoad}
          onError={handleError}
          imgClassName="card-cover-img"
        />
        <div
          className="admin-cover-preview-guide admin-cover-preview-guide--x"
          style={{ left: `${displayFocusX}%` }}
        />
        <div
          className="admin-cover-preview-guide"
          style={{ top: `${displayFocusY}%` }}
        />
        <span className="admin-cover-preview-badge">
          {displayFocusX}% · {displayFocusY}% · {displayZoom}%
        </span>
      </div>

      <div className="admin-cover-controls">
        <div className="admin-cover-mode">
          <button
            type="button"
            className={`admin-cover-mode-btn ${!form.coverFramingManual ? 'admin-cover-mode-btn--active' : ''}`}
            onClick={() =>
              setForm({
                ...form,
                coverFramingManual: false,
                coverFocusY: '',
                coverFocusX: '',
                coverZoom: '',
              })
            }
          >
            Automático
            <span className="admin-cover-mode-value">
              {autoFocusX}% · {autoFocusY}% · {autoZoom}%
            </span>
          </button>
          <button
            type="button"
            className={`admin-cover-mode-btn ${form.coverFramingManual ? 'admin-cover-mode-btn--active' : ''}`}
            onClick={enableManual}
          >
            Manual
          </button>
        </div>

        <label className="admin-cover-slider-label">
          <span>Foco vertical (Y)</span>
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

        <label className="admin-cover-slider-label">
          <span>Foco horizontal (X)</span>
          <span className="admin-cover-slider-value">{displayFocusX}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={displayFocusX}
          className="admin-cover-slider"
          onChange={(e) => setFocusX(Number(e.target.value))}
        />

        <label className="admin-cover-slider-label">
          <span>Zoom</span>
          <span className="admin-cover-slider-value">{displayZoom}%</span>
        </label>
        <input
          type="range"
          min={75}
          max={160}
          step={1}
          value={displayZoom}
          className="admin-cover-slider"
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <div className="admin-cover-slider-hints">
          <span>Afastar</span>
          <span>100%</span>
          <span>Zoom in</span>
        </div>

        <p className="admin-hint admin-cover-hint">
          {form.coverFramingManual
            ? 'Preview ao vivo — salve para aplicar nos cards. Ajuste X/Y/zoom para harmonizar distâncias entre capas 4K.'
            : 'Automático por nome, categoria e músculos (inferiores priorizam pés). Arraste qualquer slider para editar manualmente.'}
        </p>
      </div>
    </div>
  );
}
