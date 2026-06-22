import type { Exercise } from '../types';
import { normalizeMuscleGroups, resolveMuscleGroup } from './muscleGroups';
import { exerciseMatchesEquipmentFilter } from './equipment';
import {
  getMuscleFilterDef,
  normalizeEquipmentFilterIds,
  normalizeMuscleFilterIds,
} from './advancedFilterTaxonomy';
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

function normalizedMuscles(ex: Exercise): string[] {
  return normalizeMuscleGroups(ex.muscleGroups);
}

function buildMuscleMatchSet(filterIds: string[]): Set<string> {
  const set = new Set<string>();
  for (const id of filterIds) {
    const def = getMuscleFilterDef(id);
    if (def) {
      for (const display of def.matchDisplays) {
        set.add(normalizeString(display));
      }
      continue;
    }
    set.add(normalizeString(resolveMuscleGroup(id)));
  }
  return set;
}

function matchesMuscleFilter(ex: Exercise, muscles: string[], role: MuscleRoleFilter): boolean {
  if (muscles.length === 0) return true;

  const groups = normalizedMuscles(ex);
  if (groups.length === 0) return false;

  const selected = buildMuscleMatchSet(muscles);
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
  const muscles = Array.isArray(data.muscles)
    ? data.muscles.filter((m): m is string => typeof m === 'string')
    : [];
  const equipment = Array.isArray(data.equipment)
    ? data.equipment.filter((e): e is string => typeof e === 'string')
    : [];

  return {
    muscles: normalizeMuscleFilterIds(muscles),
    muscleRole:
      data.muscleRole === 'primary' || data.muscleRole === 'secondary' ? data.muscleRole : 'any',
    equipment: normalizeEquipmentFilterIds(equipment),
    favoritesOnly: data.favoritesOnly === true,
  };
}
