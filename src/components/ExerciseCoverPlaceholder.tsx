import { BrandLogo } from './BrandLogo';
import { Icon } from './Icon';

interface ExerciseCoverPlaceholderProps {
  className?: string;
}

/** Capa ausente — logo por tema + play discreto, sem imagem quebrada */
export function ExerciseCoverPlaceholder({ className = '' }: ExerciseCoverPlaceholderProps) {
  return (
    <div className={`cover-placeholder ${className}`.trim()} aria-hidden="true">
      <div className="cover-placeholder__sheen" />
      <div className="cover-placeholder__logo">
        <BrandLogo variant="card" alt="" />
      </div>
      <div className="cover-placeholder__play" aria-hidden="true">
        <Icon name="play" className="cover-placeholder__play-icon" strokeWidth={1.75} />
      </div>
    </div>
  );
}
