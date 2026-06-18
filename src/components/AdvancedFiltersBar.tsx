import { useEffect, useRef, useState } from 'react';
import type { AdvancedFilterState, MuscleRoleFilter } from '../lib/exerciseFilters';
import {
  countActiveAdvancedFilterGroups,
  EQUIPMENT_FILTER_OPTIONS,
  FILTER_MUSCLE_OPTIONS,
  hasActiveAdvancedFilters,
} from '../lib/exerciseFilters';
import { Icon } from './Icon';

interface AdvancedFiltersBarProps {
  filters: AdvancedFilterState;
  onChange: (next: AdvancedFilterState) => void;
  onReset: () => void;
  resultCount?: number;
}

function toggleListItem(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

export function AdvancedFiltersBar({
  filters,
  onChange,
  onReset,
  resultCount,
}: AdvancedFiltersBarProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeCount = countActiveAdvancedFilterGroups(filters);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const patch = (patchValue: Partial<AdvancedFilterState>) => {
    onChange({ ...filters, ...patchValue });
  };

  return (
    <div className="advanced-filters cinema-container mb-fluid-md">
      <div
        ref={rootRef}
        className={`advanced-filters-shell ${open ? 'advanced-filters-shell--open' : ''}`}
      >
        <div className="advanced-filters-bar">
          <button
            type="button"
            className={`advanced-filters-toggle ${open ? 'advanced-filters-toggle--open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <Icon name="filter" className="w-4 h-4 shrink-0" />
            <span>Filtros avançados</span>
            {activeCount > 0 && <span className="advanced-filters-badge">{activeCount}</span>}
            <Icon name="chevrondown" className="w-3.5 h-3.5 advanced-filters-chevron" />
          </button>

          {hasActiveAdvancedFilters(filters) && (
            <button type="button" className="advanced-filters-clear" onClick={onReset}>
              Limpar
            </button>
          )}

          {typeof resultCount === 'number' && hasActiveAdvancedFilters(filters) && (
            <span className="advanced-filters-count">
              {resultCount} {resultCount === 1 ? 'exercício' : 'exercícios'}
            </span>
          )}
        </div>

        {open && (
          <div className="advanced-filters-panel-wrap">
            <div className="advanced-filters-panel">
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
          </div>
        )}
      </div>
    </div>
  );
}
