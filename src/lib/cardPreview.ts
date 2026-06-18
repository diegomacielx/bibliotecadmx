import type { Exercise } from '../types';
import { buildGcsVideoMediaUrl } from './utils';

/** Preview mudo no hover do card — timing estilo catálogo streaming */
export const CARD_PREVIEW_HOVER_DELAY_MS = 1100;
export const CARD_PREVIEW_CLIP_SECONDS = 6;
/** Fade curto — vídeo já está bufferizado durante o delay de hover */
export const CARD_PREVIEW_FADE_MS = 140;

/** Qualidade usada no bucket GCS (mesmo padrão do download) */
export const CARD_PREVIEW_GCS_QUALITY = '4K';

/**
 * URL do MP4 oficial no bucket GCS para preview no card.
 * Sempre retorna a URL — se o vídeo não existir, o <video> dispara onError
 * e o preview é escondido. Evita depender da flag hasCloudVideo (que só é
 * auditada por admin em desktop e pode estar desatualizada).
 */
export function resolveCardPreviewVideoUrl(ex: Exercise): string {
  return buildGcsVideoMediaUrl(ex.id, CARD_PREVIEW_GCS_QUALITY);
}

export function isCardPreviewVertical(ex: Exercise): boolean {
  return ex.videoOrientation === 'vertical' || ex.aspectRatio === '9/16';
}

const warmedPreviewUrls = new Set<string>();

/** Dispara fetch antecipado do MP4 (deduplicado por URL) */
export function warmCardPreviewVideo(url: string): void {
  if (typeof window === 'undefined' || !url || warmedPreviewUrls.has(url)) return;
  warmedPreviewUrls.add(url);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'fetch';
  link.href = url;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}
