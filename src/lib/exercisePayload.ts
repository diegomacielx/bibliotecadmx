import { deleteField } from 'firebase/firestore';
import type { Exercise, ExerciseForm } from '../types';
import { parseCommaList } from './utils';
import { normalizeMuscleGroups } from './muscleGroups';
import { parseCoverFocusYInput } from './coverFocus';

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
    youtubeUrl: String(form.youtubeUrl || '').trim(),
    thumbnail: String(form.thumbnail || '').trim(),
    updatedAt: new Date().toISOString(),
  };

  const manualFocus = parseCoverFocusYInput(form.coverFocusY);
  if (manualFocus !== undefined) {
    payload.coverFocusY = manualFocus;
  } else if (existing?.coverFocusY !== undefined) {
    payload.coverFocusY = deleteField();
  }

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
