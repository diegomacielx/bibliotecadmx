import { normalizeMuscleGroups } from '../lib/muscleGroups';

interface MuscleGroupListProps {
  groups: string[] | undefined | null;
  className?: string;
  compact?: boolean;
  showTitle?: boolean;
}

export function MuscleGroupList({
  groups,
  className = '',
  compact = false,
  showTitle = true,
}: MuscleGroupListProps) {
  const muscles = normalizeMuscleGroups(groups);
  if (muscles.length === 0) return null;

  return (
    <div className={`lightbox-muscle-block ${className}`.trim()}>
      {showTitle && (
        <h3 className="lightbox-section-label mb-2">
          Músculos
        </h3>
      )}
      <ul className={`lightbox-muscle-list ${compact ? 'lightbox-muscle-list--compact' : ''}`.trim()}>
        {muscles.map((muscle) => (
          <li key={muscle}>{muscle}</li>
        ))}
      </ul>
    </div>
  );
}
