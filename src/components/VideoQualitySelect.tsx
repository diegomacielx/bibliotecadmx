import { useCallback, useEffect, useState, type RefObject } from 'react';
import type { YouTubePlayerHandle } from './YouTubePlayer';
import { labelYouTubeQuality, readYouTubeQualities, type YoutubeQualityLevel } from '../lib/youtubeQuality';
import { Icon } from './Icon';

interface VideoQualitySelectProps {
  playerRef: RefObject<YouTubePlayerHandle | null>;
  /** Incrementar quando o player ficar pronto */
  readyToken?: number;
}

export function VideoQualitySelect({ playerRef, readyToken = 0 }: VideoQualitySelectProps) {
  const [levels, setLevels] = useState<YoutubeQualityLevel[]>([]);
  const [current, setCurrent] = useState<string>('auto');
  const [open, setOpen] = useState(false);
  const qualityOptions = Array.from(new Set<YoutubeQualityLevel | 'auto'>(['auto', ...levels]));

  const refresh = useCallback(() => {
    const snapshot = readYouTubeQualities(playerRef.current);
    if (snapshot.levels.length > 0) setLevels(snapshot.levels);
    if (snapshot.current) setCurrent(snapshot.current);
  }, [playerRef]);

  useEffect(() => {
    refresh();
    const delays = [0, 400, 1200, 2500, 5000];
    const timers = delays.map((ms) => window.setTimeout(refresh, ms));
    const timer = window.setInterval(refresh, 1500);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearInterval(timer);
    };
  }, [refresh, readyToken]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-quality-menu]')) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handlePick = (quality: YoutubeQualityLevel | 'auto') => {
    try {
      playerRef.current?.setPlaybackQuality(quality);
      setCurrent(quality);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (levels.length === 0) {
    if (readyToken === 0) return null;
    return (
      <div className="video-quality-select" data-quality-menu>
        <button type="button" className="lightbox-btn lightbox-btn--ghost w-full justify-between" disabled>
          <span className="inline-flex items-center gap-2">
            <Icon name="settings" className="w-3.5 h-3.5" strokeWidth={1.75} />
            Qualidade do vídeo
          </span>
          <span className="text-zinc-500 text-xs font-medium">Carregando…</span>
        </button>
      </div>
    );
  }

  return (
    <div className="video-quality-select" data-quality-menu>
      <button
        type="button"
        className="lightbox-btn lightbox-btn--ghost w-full justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          refresh();
          setOpen((v) => !v);
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="settings" className="w-3.5 h-3.5" strokeWidth={1.75} />
          Qualidade do vídeo
        </span>
        <span className="text-zinc-400 text-xs font-medium tabular-nums">
          {labelYouTubeQuality(current)}
        </span>
      </button>

      {open && (
        <ul className="video-quality-select__menu" role="listbox" aria-label="Qualidade do vídeo">
          {qualityOptions.map((quality) => (
            <li key={quality}>
              <button
                type="button"
                role="option"
                aria-selected={current === quality}
                className={`video-quality-select__option ${
                  current === quality ? 'video-quality-select__option--active' : ''
                }`}
                onClick={() => handlePick(quality)}
              >
                {labelYouTubeQuality(quality)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
