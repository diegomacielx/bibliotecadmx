import { deleteField } from 'firebase/firestore';
import type { Exercise, ExerciseForm } from '../types';
import { parseCommaList } from './utils';
import { normalizeMuscleGroups } from './muscleGroups';
import { normalizeEquipment } from './equipment';
import {
  parseCoverFocusXInput,
  parseCoverFocusYInput,
  parseCoverZoomInput,
} from './coverFocus';

function applyCoverFramingFields(
  payload: Record<string, unknown>,
  form: ExerciseForm,
  existing?: Exercise | null
): void {
  if (!form.coverFramingManual) {
    if (existing?.coverFocusY !== undefined) payload.coverFocusY = deleteField();
    if (existing?.coverFocusX !== undefined) payload.coverFocusX = deleteField();
    if (existing?.coverZoom !== undefined) payload.coverZoom = deleteField();
    return;
  }

  payload.coverFocusY = parseCoverFocusYInput(form.coverFocusY);
  payload.coverFocusX = parseCoverFocusXInput(form.coverFocusX) ?? 50;
  payload.coverZoom = parseCoverZoomInput(form.coverZoom) ?? 1;
}

/** Campos permitidos no Firestore — evita enviar firestoreId ou campos inválidos */
export function buildExerciseWritePayload(
  form: ExerciseForm,
  targetId: string,
  existing?: Exercise | null
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: targetId,
    name: String(form.name).trim(),
    category: form.category,
    muscleGroups: normalizeMuscleGroups(parseCommaList(form.muscleGroups)),
    keywords: parseCommaList(form.keywords),
    equipment: normalizeEquipment(form.equipment),
    youtubeUrl: String(form.youtubeUrl || '').trim(),
    thumbnail: String(form.thumbnail || '').trim(),
    updatedAt: new Date().toISOString(),
  };

  applyCoverFramingFields(payload, form, existing);

  if (existing) {
    if (existing.createdAt) payload.createdAt = existing.createdAt;
    if (existing.hasCloudVideo !== undefined && existing.hasCloudVideo !== null) {
      payload.hasCloudVideo = existing.hasCloudVideo;
    } else if (form.hasCloudVideo !== undefined && form.hasCloudVideo !== null) {
      payload.hasCloudVideo = form.hasCloudVideo;
    }
    if (existing.videoOrientation) payload.videoOrientation = existing.videoOrientation;
    if (existing.aspectRatio) payload.aspectRatio = existing.aspectRatio;
  } else {
    payload.hasCloudVideo = null;
    payload.createdAt = new Date().toISOString();
  }

  return payload;
}

/** Atualização otimista da lista após salvar no admin */
export function applyExerciseSaveToList(
  exercises: Exercise[],
  editingId: string | null,
  payload: Record<string, unknown>,
  form: ExerciseForm
): Exercise[] {
  const framingPatch = form.coverFramingManual
    ? {
        coverFocusY: parseCoverFocusYInput(form.coverFocusY),
        coverFocusX: parseCoverFocusXInput(form.coverFocusX) ?? 50,
        coverZoom: parseCoverZoomInput(form.coverZoom) ?? 1,
      }
    : {};

  if (editingId) {
    return exercises.map((ex) => {
      if (ex.firestoreId !== editingId) return ex;
      const updated: Exercise = {
        ...ex,
        id: String(payload.id ?? ex.id),
        name: String(payload.name ?? ex.name),
        category: String(payload.category ?? ex.category),
        muscleGroups: (payload.muscleGroups as string[]) ?? ex.muscleGroups,
        keywords: (payload.keywords as string[]) ?? ex.keywords,
        equipment: (payload.equipment as string[]) ?? ex.equipment,
        youtubeUrl: String(payload.youtubeUrl ?? ex.youtubeUrl),
        thumbnail: String(payload.thumbnail ?? ex.thumbnail),
        updatedAt: String(payload.updatedAt ?? ex.updatedAt),
      };
      if (!form.coverFramingManual) {
        delete updated.coverFocusY;
        delete updated.coverFocusX;
        delete updated.coverZoom;
      } else {
        if (framingPatch.coverFocusY !== undefined) updated.coverFocusY = framingPatch.coverFocusY;
        if (framingPatch.coverFocusX !== undefined) updated.coverFocusX = framingPatch.coverFocusX;
        if (framingPatch.coverZoom !== undefined) updated.coverZoom = framingPatch.coverZoom;
      }
      return updated;
    });
  }

  return exercises;
}
