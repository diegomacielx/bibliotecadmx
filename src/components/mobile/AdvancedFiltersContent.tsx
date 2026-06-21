import type { AdvancedFilterState, MuscleRoleFilter } from '../../lib/exerciseFilters';
import { EQUIPMENT_FILTER_OPTIONS, FILTER_MUSCLE_OPTIONS } from '../../lib/exerciseFilters';
import { Icon } from '../Icon';

function toggleListItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

interface AdvancedFiltersContentProps {
  filters: AdvancedFilterState;
  onChange: (next: AdvancedFilterState) => void;
  activeCategory?: string;
  favoriteCount?: number;
  className?: string;
}

export function AdvancedFiltersContent({
  filters,
  onChange,
  activeCategory,
  favoriteCount = 0,
  className = '',
}: AdvancedFiltersContentProps) {
  const patch = (patchValue: Partial<AdvancedFilterState>) => {
    onChange({ ...filters, ...patchValue });
  };

  const showFavoritesFilter = activeCategory !== 'Favoritos';
  const favoritesDisabled = favoriteCount === 0;

  return (
    <div className={`advanced-filters-panel ${className}`.trim()}>
      {showFavoritesFilter && (
        <section className="advanced-filters-section">
          <h3 className="advanced-filters-heading">Favoritos</h3>
          <div className="advanced-filters-pills">
            <button
              type="button"
              className={`advanced-filters-pill advanced-filters-pill--icon ${
                filters.favoritesOnly ? 'advanced-filters-pill--active' : ''
              }`}
              disabled={favoritesDisabled}
              title={favoritesDisabled ? 'Favorite exercícios para usar este filtro' : undefined}
              onClick={() => patch({ favoritesOnly: !filters.favoritesOnly })}
            >
              <Icon
                name="heart"
                className={`w-3.5 h-3.5 shrink-0 ${filters.favoritesOnly ? 'text-red-400' : ''}`}
              />
              Somente favoritos
            </button>
          </div>
        </section>
      )}

      <section className="advanced-filters-section">
        <h3 className="advanced-filters-heading">Grupo muscular</h3>
        <div className="advanced-filters-pills">
          {FILTER_MUSCLE_OPTIONS.map((muscle) => {
            const active = filters.muscles.includes(muscle);
            return (
              <button
                key={muscle}
                type="button"
                className={`advanced-filters-pill ${active ? 'advanced-filters-pill--active' : ''}`}
                onClick={() => patch({ muscles: toggleListItem(filters.muscles, muscle) })}
              >
                {muscle}
              </button>
            );
          })}
        </div>
        {filters.muscles.length > 0 && (
          <div className="advanced-filters-subrow">
            <span className="advanced-filters-sublabel">Papel do músculo</span>
            <div className="advanced-filters-segmented">
              {(
                [
                  ['any', 'Qualquer'],
                  ['primary', 'Primário'],
                  ['secondary', 'Secundário'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`advanced-filters-segment ${
                    filters.muscleRole === value ? 'advanced-filters-segment--active' : ''
                  }`}
                  onClick={() => patch({ muscleRole: value as MuscleRoleFilter })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="advanced-filters-section">
        <h3 className="advanced-filters-heading">Equipamento</h3>
        <div className="advanced-filters-pills">
          {EQUIPMENT_FILTER_OPTIONS.map(({ id, label }) => {
            const active = filters.equipment.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`advanced-filters-pill ${active ? 'advanced-filters-pill--active' : ''}`}
                onClick={() => patch({ equipment: toggleListItem(filters.equipment, id) })}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
