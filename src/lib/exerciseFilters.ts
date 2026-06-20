import type { Exercise } from '../types';
import { normalizeMuscleGroups, resolveMuscleGroup } from './muscleGroups';
import { exerciseMatchesEquipmentFilter, EQUIPMENT_OPTIONS } from './equipment';
import { normalizeString } from './utils';

export type MuscleRoleFilter = 'any' | 'primary' | 'secondary';

export interface AdvancedFilterState {
  muscles: string[];
  muscleRole: MuscleRoleFilter;
  equipment: string[];
  favoritesOnly: boolean;
}

export const DEFAULT_ADVANCED_FILTERS: AdvancedFilterState = {
  muscles: [],
  muscleRole: 'any',
  equipment: [],
  favoritesOnly: false,
};

/** Grupos musculares disponíveis nos filtros */
export const FILTER_MUSCLE_OPTIONS = [
  'Peitoral',
  'Costas',
  'Quadríceps',
  'Posterior de coxa',
  'Glúteos',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraço',
  'Panturrilha',
  'Abdômen',
  'Trapézio',
  'Lombar',
  'Adutores',
  'Abdutores',
] as const;

export const EQUIPMENT_FILTER_OPTIONS = EQUIPMENT_OPTIONS;

function normalizedMuscles(ex: Exercise): string[] {
  return normalizeMuscleGroups(ex.muscleGroups);
}

function matchesMuscleFilter(ex: Exercise, muscles: string[], role: MuscleRoleFilter): boolean {
  if (muscles.length === 0) return true;

  const groups = normalizedMuscles(ex);
  if (groups.length === 0) return false;

  const selected = new Set(muscles.map((m) => normalizeString(resolveMuscleGroup(m))));

  const matchesGroup = (group: string) => selected.has(normalizeString(group));

  if (role === 'primary') {
    return matchesGroup(groups[0]);
  }

  if (role === 'secondary') {
    return groups.slice(1).some(matchesGroup);
  }

  return groups.some(matchesGroup);
}

export function hasActiveAdvancedFilters(filters: AdvancedFilterState): boolean {
  return filters.muscles.length > 0 || filters.equipment.length > 0 || filters.favoritesOnly;
}

export function countActiveAdvancedFilterGroups(filters: AdvancedFilterState): number {
  let count = 0;
  if (filters.muscles.length > 0) count += 1;
  if (filters.equipment.length > 0) count += 1;
  if (filters.favoritesOnly) count += 1;
  return count;
}

export function applyAdvancedFilters(
  items: Exercise[],
  filters: AdvancedFilterState,
  favoriteIds?: Set<string>
): Exercise[] {
  if (!hasActiveAdvancedFilters(filters)) return items;

  return items.filter((ex) => {
    if (filters.favoritesOnly) {
      if (!favoriteIds?.has(ex.firestoreId)) return false;
    }
    if (!matchesMuscleFilter(ex, filters.muscles, filters.muscleRole)) return false;
    if (filters.equipment.length > 0) {
      if (!exerciseMatchesEquipmentFilter(ex, filters.equipment)) return false;
    }
    return true;
  });
}

export function parseAdvancedFilters(raw: unknown): AdvancedFilterState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ADVANCED_FILTERS };
  const data = raw as Record<string, unknown>;
  return {
    muscles: Array.isArray(data.muscles)
      ? data.muscles.filter((m): m is string => typeof m === 'string')
      : [],
    muscleRole:
      data.muscleRole === 'primary' || data.muscleRole === 'secondary' ? data.muscleRole : 'any',
    equipment: Array.isArray(data.equipment)
      ? data.equipment.filter((e): e is string => typeof e === 'string')
      : [],
    favoritesOnly: data.favoritesOnly === true,
  };
}
