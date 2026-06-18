import { useCallback, useEffect, useRef, useState } from 'react';
import { CARD_PREVIEW_CLIP_SECONDS, CARD_PREVIEW_FADE_MS } from '../lib/cardPreview';

interface CardVideoPreviewProps {
  src: string;
  title: string;
  isVertical?: boolean;
  /** true após o delay de hover — revela o vídeo quando já bufferizado */
  revealed?: boolean;
  onPlaying?: () => void;
  onError?: () => void;
}

export function CardVideoPreview({
  src,
  title,
  isVertical = false,
  revealed = true,
  onPlaying,
  onError,
}: CardVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const engagedRef = useRef(false);
  const revealedRef = useRef(revealed);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    revealedRef.current = revealed;
    if (revealed && engagedRef.current) {
      setVisible(true);
      onPlaying?.();
    }
  }, [revealed, onPlaying]);

  const engage = useCallback(() => {
    if (engagedRef.current) return;
    engagedRef.current = true;
    if (revealedRef.current) {
      setVisible(true);
      onPlaying?.();
    }
  }, [onPlaying]);

  useEffect(() => {
    engagedRef.current = false;
    setVisible(false);
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      void video.play().catch(() => {
        /* autoplay mudo — onError cobre falhas reais */
      });
    };

    const onReady = () => {
      if (video.readyState >= 2) engage();
      tryPlay();
    };

    if (video.readyState >= 2) onReady();
    else {
      video.addEventListener('loadeddata', onReady, { once: true });
      video.addEventListener('canplay', onReady, { once: true });
    }

    tryPlay();

    return () => {
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.pause();
    };
  }, [src, engage]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!video.paused && video.currentTime > 0) engage();
      if (video.currentTime >= CARD_PREVIEW_CLIP_SECONDS) {
        video.currentTime = 0;
      }
    };
    const onPlaying = () => engage();

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('playing', onPlaying);
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('playing', onPlaying);
    };
  }, [engage]);

  return (
    <div
      className={`card-preview-player ${visible ? 'card-preview-player--visible' : ''} ${
        isVertical ? 'card-preview-player--vertical' : ''
      }`.trim()}
      style={{ transitionDuration: `${CARD_PREVIEW_FADE_MS}ms` }}
    >
      <video
        ref={videoRef}
        src={src}
        className="card-preview-video"
        muted
        playsInline
        autoPlay
        loop
        preload="auto"
        disablePictureInPicture
        aria-hidden={!visible}
        aria-label={visible ? title : undefined}
        onError={() => onError?.()}
      />
    </div>
  );
}
