interface SkeletonProps {
  className?: string;
  aspectRatio?: string;
}

export function Skeleton({ className = '', aspectRatio }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer rounded-cinema bg-zinc-900 ${className}`}
      style={aspectRatio ? { aspectRatio } : undefined}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return <Skeleton className="w-full aspect-card-poster rounded-cinema-lg" />;
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-fluid-md">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
