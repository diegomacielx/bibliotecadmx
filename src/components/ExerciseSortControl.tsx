import type { ExerciseSortOrder } from '../lib/utils';

interface ExerciseSortControlProps {
  value: ExerciseSortOrder;
  onChange: (value: ExerciseSortOrder) => void;
}

export function ExerciseSortControl({ value, onChange }: ExerciseSortControlProps) {
  return (
    <div className="exercise-sort cinema-container mb-fluid-md">
      <div className="exercise-sort-inner">
        <span className="exercise-sort-label">Ordenar por</span>
        <div className="exercise-sort-group" role="group" aria-label="Ordenação dos exercícios">
          <button
            type="button"
            className={`exercise-sort-btn ${value === 'id' ? 'exercise-sort-btn--active' : ''}`}
            onClick={() => onChange('id')}
            aria-pressed={value === 'id'}
          >
            ID
          </button>
          <button
            type="button"
            className={`exercise-sort-btn ${value === 'alpha' ? 'exercise-sort-btn--active' : ''}`}
            onClick={() => onChange('alpha')}
            aria-pressed={value === 'alpha'}
          >
            Nome (A–Z)
          </button>
        </div>
      </div>
    </div>
  );
}
