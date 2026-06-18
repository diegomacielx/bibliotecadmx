import type { CSSProperties } from 'react';
import { BrandLogo } from './BrandLogo';

interface ExerciseCoverPlaceholderProps {
  className?: string;
  exerciseId?: string;
  category?: string;
  /** Camada atrás da capa real enquanto carrega */
  subdued?: boolean;
}

function seedFromString(input: string): number {
  let s = 0;
  for (let i = 0; i < input.length; i++) {
    s = (Math.imul(31, s) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(s);
}

export function getCoverPlaceholderStyle(exerciseId?: string, category?: string): CSSProperties {
  const seed = seedFromString(`${exerciseId ?? '0'}|${category ?? ''}`);
  const hue = seed % 360;
  const hue2 = (hue + 42 + (seed % 48)) % 360;
  return {
    '--cover-placeholder-hue': String(hue),
    '--cover-placeholder-hue-2': String(hue2),
    '--cover-placeholder-glow': `hsla(${hue}, 58%, 54%, 0.2)`,
    '--cover-placeholder-accent': `hsla(${hue2}, 46%, 56%, 0.16)`,
  } as CSSProperties;
}

/** Capa ausente ou carregando — fundo temático + logo */
export function ExerciseCoverPlaceholder({
  className = '',
  exerciseId,
  category,
  subdued = false,
}: ExerciseCoverPlaceholderProps) {
  const style = getCoverPlaceholderStyle(exerciseId, category);

  return (
    <div
      className={`cover-placeholder ${subdued ? 'cover-placeholder--subdued' : ''} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      <div className="cover-placeholder__mesh" />
      <div className="cover-placeholder__sheen" />
      <div className="cover-placeholder__logo">
        <BrandLogo variant="card" alt="" />
      </div>
    </div>
  );
}
