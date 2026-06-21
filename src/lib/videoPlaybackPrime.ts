import type { Exercise } from '../types';
import { getYouTubeId } from './utils';
import { preloadYouTubePlayerApi } from '../components/YouTubePlayer';
import { isMobileUi } from '../hooks/useMediaQuery';

let warmVideoId: string | null = null;
let warmIframe: HTMLIFrameElement | null = null;
let warmHost: HTMLDivElement | null = null;

function ensureWarmHost(): HTMLDivElement {
  if (!warmHost) {
    warmHost = document.createElement('div');
    warmHost.id = 'dmx-yt-warm-host';
    warmHost.setAttribute('aria-hidden', 'true');
    warmHost.style.cssText =
      'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;top:0';
    document.body.appendChild(warmHost);
  }
  return warmHost;
}

function buildWarmEmbedUrl(videoId: string): string {
  const origin = encodeURIComponent(window.location.origin);
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&origin=${origin}`;
}

/** Pré-carrega a API do YouTube IFrame */
export function primeYouTubePlayerApi(): void {
  void preloadYouTubePlayerApi();
}

/** Remove iframe oculto de aquecimento (libera memória no Safari/iOS). */
export function disposeYouTubeWarmup(): void {
  if (typeof window === 'undefined') return;
  warmIframe?.remove();
  warmIframe = null;
  warmVideoId = null;
}

/** Iframe oculto com vídeo em fila — aquece CDN/conexão antes do clique */
export function warmYouTubeVideo(videoId: string): void {
  if (!videoId || typeof window === 'undefined') return;
  if (isMobileUi()) return;

  primeYouTubePlayerApi();

  if (warmVideoId === videoId && warmIframe) return;

  warmVideoId = videoId;
  const host = ensureWarmHost();

  if (warmIframe) {
    warmIframe.src = buildWarmEmbedUrl(videoId);
    return;
  }

  warmIframe = document.createElement('iframe');
  warmIframe.src = buildWarmEmbedUrl(videoId);
  warmIframe.title = 'Pré-carregamento de vídeo';
  warmIframe.loading = 'eager';
  warmIframe.setAttribute(
    'allow',
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
  );
  host.appendChild(warmIframe);
}

/** Hover / pointerdown / abrir lightbox — máxima prioridade para playback instantâneo */
export function primeVideoPlaybackIntent(ex: Pick<Exercise, 'youtubeUrl'>): void {
  if (isMobileUi()) {
    void preloadYouTubePlayerApi();
    return;
  }

  primeYouTubePlayerApi();
  const videoId = getYouTubeId(ex.youtubeUrl);
  if (videoId) warmYouTubeVideo(videoId);
}
