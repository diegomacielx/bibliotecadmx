import { useCallback, useState } from 'react';
import {
  BRAND_LOGO_CANDIDATES,
  BRAND_LOGO_LIGHT_CANDIDATES,
  CUSTOM_LOGO_FALLBACK,
} from '../lib/constants';

interface BrandLogoProps {
  alt?: string;
  className?: string;
  /** Header compacto, login maior ou capa de card sem imagem */
  variant?: 'header' | 'auth' | 'card';
}

function LogoLayer({
  candidates,
  layer,
  variant,
  alt,
  className,
}: {
  candidates: readonly string[];
  layer: 'dark' | 'light';
  variant: 'header' | 'auth' | 'card';
  alt: string;
  className?: string;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [useFallback, setUseFallback] = useState(false);

  const src = useFallback ? CUSTOM_LOGO_FALLBACK : candidates[candidateIndex];

  const handleError = useCallback(() => {
    if (useFallback) return;
    const next = candidateIndex + 1;
    if (next < candidates.length) {
      setCandidateIndex(next);
      return;
    }
    setUseFallback(true);
  }, [candidateIndex, useFallback, candidates.length]);

  return (
    <img
      src={src}
      alt={alt}
      className={`brand-logo brand-logo--${variant} brand-logo-layer brand-logo-layer--${layer} ${
        useFallback ? 'brand-logo--fallback' : ''
      } ${className ?? ''}`}
      loading="eager"
      decoding="async"
      onError={handleError}
    />
  );
}

export function BrandLogo({ alt = 'DMX', className = '', variant = 'header' }: BrandLogoProps) {
  return (
    <span className={`brand-logo-stack brand-logo-stack--${variant} ${className}`}>
      <LogoLayer
        candidates={BRAND_LOGO_CANDIDATES}
        layer="dark"
        variant={variant}
        alt={alt}
      />
      <LogoLayer
        candidates={BRAND_LOGO_LIGHT_CANDIDATES}
        layer="light"
        variant={variant}
        alt=""
      />
    </span>
  );
}
