import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { YouTubePlayerHandle } from './YouTubePlayer';

interface VideoProgressBarProps {
  playerRef: RefObject<YouTubePlayerHandle | null>;
  /** Incrementar quando o player ficar pronto */
  readyToken?: number;
  /** Se a barra deve estar visível (auto-hide do lightbox) */
  visible?: boolean;
  /** Disparado em qualquer interação para resetar o timer de auto-hide */
  onInteract?: () => void;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) value = 0;
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VideoProgressBar({
  playerRef,
  readyToken = 0,
  visible = true,
  onInteract,
}: VideoProgressBarProps) {
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);

  useEffect(() => {
    scrubbingRef.current = scrubbing;
  }, [scrubbing]);

  useEffect(() => {
    let active = true;
    let timer = 0;

    const tick = () => {
      if (!active) return;
      const player = playerRef.current;
      if (player) {
        const dur = player.getDuration();
        if (dur && Math.abs(dur - duration) > 0.5) setDuration(dur);
        if (!scrubbingRef.current) setCurrent(player.getCurrentTime());
        setLoaded(player.getVideoLoadedFraction());
      }
      timer = window.setTimeout(tick, 250);
    };

    tick();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [playerRef, readyToken, duration]);

  const seekToClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      const player = playerRef.current;
      if (!el || !player || duration <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const target = ratio * duration;
      setCurrent(target);
      player.seekTo(target);
      onInteract?.();
    },
    [duration, playerRef, onInteract]
  );

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setScrubbing(true);
    scrubbingRef.current = true;
    seekToClientX(e.clientX);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    seekToClientX(e.clientX);
  };

  const endScrub = (e: PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    e.stopPropagation();
    seekToClientX(e.clientX);
    setScrubbing(false);
    scrubbingRef.current = false;
  };

  if (duration <= 0) return null;

  const playedPct = Math.min(100, (current / duration) * 100);
  const loadedPct = Math.min(100, loaded * 100);

  return (
    <div
      className={`cinema-seekbar ${visible || scrubbing ? '' : 'cinema-seekbar--hidden'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="cinema-seekbar__time tabular-nums">{formatTime(current)}</span>
      <div
        ref={trackRef}
        className={`cinema-seekbar__track ${scrubbing ? 'is-scrubbing' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Progresso do vídeo"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
      >
        <div className="cinema-seekbar__buffered" style={{ width: `${loadedPct}%` }} />
        <div className="cinema-seekbar__played" style={{ width: `${playedPct}%` }} />
        <span className="cinema-seekbar__thumb" style={{ left: `${playedPct}%` }} />
      </div>
      <span className="cinema-seekbar__time tabular-nums">{formatTime(duration)}</span>
    </div>
  );
}
