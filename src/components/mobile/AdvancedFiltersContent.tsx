import { useCallback, useMemo, useState } from 'react';
import type { AdvancedFilterState, MuscleRoleFilter } from '../../lib/exerciseFilters';
import {
  EQUIPMENT_FILTER_OPTIONS,
  MUSCLE_FILTER_SECTIONS,
  type FilterOptionDef,
} from '../../lib/advancedFilterTaxonomy';
import { Icon } from '../Icon';

function getSubIds(option: { subOptions?: { id: string }[] }): string[] {
  return option.subOptions?.map((sub) => sub.id) ?? [];
}

function toggleParentFilter(list: string[], option: { id: string; subOptions?: { id: string }[] }): string[] {
  const subIds = getSubIds(option);
  const isActive = list.includes(option.id);

  if (isActive) {
    return list.filter((id) => id !== option.id);
  }

  return [...list.filter((id) => !subIds.includes(id)), option.id];
}

function toggleSubFilter(
  list: string[],
  parent: { id: string; subOptions?: { id: string }[] },
  subId: string
): string[] {
  const subIds = getSubIds(parent);
  const isActive = list.includes(subId);

  if (isActive) {
    return list.filter((id) => id !== subId);
  }

  return [...list.filter((id) => id !== parent.id && !subIds.includes(id)), subId];
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  subOptions?: FilterOptionDef[];
  expanded?: boolean;
  onExpandToggle?: () => void;
  selectedSubs?: string[];
  onSubToggle?: (subId: string) => void;
}

function FilterPill({
  label,
  active,
  onToggle,
  subOptions,
  expanded,
  onExpandToggle,
  selectedSubs = [],
  onSubToggle,
}: FilterPillProps) {
  const hasSubs = Boolean(subOptions?.length);

  return (
    <div className={`advanced-filters-pill-group${hasSubs ? ' advanced-filters-pill-group--has-sub' : ''}`}>
      <button
        type="button"
        className={`advanced-filters-pill ${active ? 'advanced-filters-pill--active' : ''}${
          hasSubs ? ' advanced-filters-pill--with-menu' : ''
        }`}
        onClick={onToggle}
      >
        {label}
      </button>

      {hasSubs && onExpandToggle && (
        <button
          type="button"
          className={`advanced-filters-pill-menu ${expanded ? 'advanced-filters-pill-menu--open' : ''}`}
          aria-expanded={expanded}
          aria-label={`Subfiltros de ${label}`}
          onClick={onExpandToggle}
        >
          <Icon name="chevrondown" className="w-3 h-3" />
        </button>
      )}

      {hasSubs && expanded && onSubToggle && (
        <div className="advanced-filters-subpills">
          {subOptions!.map((sub) => {
            const subActive = selectedSubs.includes(sub.id);
            return (
              <button
                key={sub.id}
                type="button"
                className={`advanced-filters-pill advanced-filters-pill--sub ${
                  subActive ? 'advanced-filters-pill--active' : ''
                }`}
                onClick={() => onSubToggle(sub.id)}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
  const [expandedMuscle, setExpandedMuscle] = useState<Set<string>>(() => new Set());
  const [expandedEquipment, setExpandedEquipment] = useState<Set<string>>(() => new Set());

  const patch = useCallback(
    (patchValue: Partial<AdvancedFilterState>) => {
      onChange({ ...filters, ...patchValue });
    },
    [filters, onChange]
  );

  const toggleExpanded = useCallback(
    (kind: 'muscle' | 'equipment', id: string) => {
      const setter = kind === 'muscle' ? setExpandedMuscle : setExpandedEquipment;
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    []
  );

  const autoExpandedMuscle = useMemo(() => {
    const ids = new Set(expandedMuscle);
    for (const section of MUSCLE_FILTER_SECTIONS) {
      for (const option of section.options) {
        if (!option.subOptions?.length) continue;
        const subIds = getSubIds(option);
        if (filters.muscles.includes(option.id) || subIds.some((id) => filters.muscles.includes(id))) {
          ids.add(option.id);
        }
      }
    }
    return ids;
  }, [expandedMuscle, filters.muscles]);

  const autoExpandedEquipment = useMemo(() => {
    const ids = new Set(expandedEquipment);
    for (const option of EQUIPMENT_FILTER_OPTIONS) {
      if (!option.subOptions?.length) continue;
      const subIds = getSubIds(option);
      if (filters.equipment.includes(option.id) || subIds.some((id) => filters.equipment.includes(id))) {
        ids.add(option.id);
      }
    }
    return ids;
  }, [expandedEquipment, filters.equipment]);

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
        {MUSCLE_FILTER_SECTIONS.map((section) => (
          <div key={section.id} className="advanced-filters-subsection">
            <h4 className="advanced-filters-subheading">{section.label}</h4>
            <div className="advanced-filters-pills advanced-filters-pills--grouped">
              {section.options.map((option) => (
                <FilterPill
                  key={option.id}
                  label={option.label}
                  active={filters.muscles.includes(option.id)}
                  subOptions={option.subOptions}
                  expanded={autoExpandedMuscle.has(option.id)}
                  selectedSubs={filters.muscles}
                  onToggle={() =>
                    patch({ muscles: toggleParentFilter(filters.muscles, option) })
                  }
                  onExpandToggle={() => toggleExpanded('muscle', option.id)}
                  onSubToggle={(subId) =>
                    patch({ muscles: toggleSubFilter(filters.muscles, option, subId) })
                  }
                />
              ))}
            </div>
          </div>
        ))}

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
        <div className="advanced-filters-pills advanced-filters-pills--grouped">
          {EQUIPMENT_FILTER_OPTIONS.map((option) => (
            <FilterPill
              key={option.id}
              label={option.label}
              active={filters.equipment.includes(option.id)}
              subOptions={option.subOptions}
              expanded={autoExpandedEquipment.has(option.id)}
              selectedSubs={filters.equipment}
              onToggle={() =>
                patch({ equipment: toggleParentFilter(filters.equipment, option) })
              }
              onExpandToggle={() => toggleExpanded('equipment', option.id)}
              onSubToggle={(subId) =>
                patch({ equipment: toggleSubFilter(filters.equipment, option, subId) })
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
