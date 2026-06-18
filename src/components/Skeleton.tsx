interface SkeletonProps {
  className?: string;
  aspectRatio?: string;
}

export function Skeleton({ className = '', aspectRatio }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      aria-hidden="true"
    />
  );
}

/** Espelha o poster do card — capa + faixa de metadados no rodapé */
export function CardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="card-skeleton"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-hidden="true"
    >
      <div className="card-skeleton__cover aspect-card-poster rounded-cinema-lg">
        <div className="card-skeleton__grain" />
        <div className="card-skeleton__vignette" />
        <div className="card-skeleton__meta">
          <Skeleton className="card-skeleton__line card-skeleton__line--category" />
          <Skeleton className="card-skeleton__line card-skeleton__line--title" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-fluid-md">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

/** Hero em carregamento — texto + capa */
export function HeroSkeleton() {
  return (
    <div className="hero-skeleton" aria-hidden="true">
      <div className="hero-skeleton__grid">
        <div className="hero-skeleton__copy">
          <Skeleton className="hero-skeleton__kicker" />
          <Skeleton className="hero-skeleton__id" />
          <Skeleton className="hero-skeleton__title" />
          <Skeleton className="hero-skeleton__cta" />
        </div>
        <Skeleton className="hero-skeleton__cover aspect-hero rounded-cinema-lg" />
      </div>
    </div>
  );
}
