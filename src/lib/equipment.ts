import type { Exercise } from '../types';
import { expandEquipmentFilterKeys } from './advancedFilterTaxonomy';
import { normalizeString } from './utils';

export const EQUIPMENT_IDS = [
  'barra',
  'smith',
  'maquina',
  'cabo',
  'halter',
  'kettlebell',
  'peso_corporal',
  'elastico',
] as const;

export type EquipmentId = (typeof EQUIPMENT_IDS)[number];

export const EQUIPMENT_OPTIONS: { id: EquipmentId; label: string }[] = [
  { id: 'barra', label: 'Barra' },
  { id: 'smith', label: 'Smith' },
  { id: 'maquina', label: 'Máquina' },
  { id: 'cabo', label: 'Cabo / Polia' },
  { id: 'halter', label: 'Halter' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'peso_corporal', label: 'Peso corporal' },
  { id: 'elastico', label: 'Elástico / Mini band' },
];

const EQUIPMENT_ID_SET = new Set<string>(EQUIPMENT_IDS);

/** Heurística legada — só quando `equipment` não está definido no exercício */
const EQUIPMENT_KEYWORDS: Record<EquipmentId, string[]> = {
  barra: ['barbell', 'barra livre', 'supino', 'agachamento', 'terra', 'remada com barra'],
  smith: ['smith'],
  maquina: ['maquina', 'máquina', 'cadeira', 'leg press', 'hack', 'aparelho', 'extensora', 'flexora'],
  cabo: ['cabo', 'polia', 'crossover', 'pulley', 'voador'],
  halter: ['halter', 'halteres', 'dumbbell', 'manu'],
  kettlebell: ['kettlebell', 'kettle bell', 'peso russo', 'kb swing'],
  peso_corporal: [
    'peso corporal',
    'bodyweight',
    'paralela',
    'flexao de braco',
    'flexão de braço',
    'flexao de peito',
    'flexão de peito',
    'barra fixa',
    'pull up',
    'pull-up',
    'prancha',
    'calistenia',
  ],
  elastico: [
    'elastico',
    'elástico',
    'mini band',
    'miniband',
    'faixa elastica',
    'faixa elástica',
    'resistance band',
    'theraband',
  ],
};

const HEURISTIC_EXCLUDES: Partial<Record<EquipmentId, EquipmentId[]>> = {
  peso_corporal: ['maquina', 'cabo', 'smith', 'halter', 'barra', 'kettlebell'],
  elastico: ['maquina', 'cabo', 'smith', 'barra'],
};

function buildEquipmentBlob(ex: Pick<Exercise, 'name' | 'keywords' | 'category'>): string {
  const keywords = Array.isArray(ex.keywords) ? ex.keywords.join(' ') : '';
  return normalizeString(`${ex.name} ${ex.category} ${keywords}`);
}

function matchesKeywordPhrase(blob: string, phrase: string): boolean {
  const key = normalizeString(phrase);
  if (!key) return false;
  if (key.includes(' ')) return blob.includes(key);
  const tokens = blob.split(/[\s\-_/]+/).filter(Boolean);
  return tokens.some((t) => t === key || (key.length >= 5 && t.startsWith(key)));
}

function matchesHeuristicEquipment(
  ex: Pick<Exercise, 'name' | 'keywords' | 'category'>,
  equipmentId: EquipmentId
): boolean {
  const keywords = EQUIPMENT_KEYWORDS[equipmentId];
  if (!keywords?.length) return false;
  const blob = buildEquipmentBlob(ex);

  const excludes = HEURISTIC_EXCLUDES[equipmentId];
  if (excludes?.some((id) => matchesHeuristicEquipment(ex, id))) return false;

  return keywords.some((k) => matchesKeywordPhrase(blob, k));
}

/** Normaliza lista gravada / importada */
export function normalizeEquipment(raw: string[] | string | undefined | null): EquipmentId[] {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',').map((s) => s.trim())
      : [];

  const seen = new Set<EquipmentId>();
  const result: EquipmentId[] = [];

  for (const item of list) {
    const id = normalizeString(String(item)) as EquipmentId;
    if (!EQUIPMENT_ID_SET.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result;
}

/** Equipamento efetivo: campo explícito ou heurística */
export function resolveExerciseEquipment(
  ex: Pick<Exercise, 'name' | 'keywords' | 'category' | 'equipment'>
): EquipmentId[] {
  const explicit = normalizeEquipment(ex.equipment);
  if (explicit.length > 0) return explicit;

  return EQUIPMENT_IDS.filter((id) => matchesHeuristicEquipment(ex, id));
}

export function exerciseMatchesEquipmentFilter(
  ex: Pick<Exercise, 'name' | 'keywords' | 'category' | 'equipment'>,
  selected: string[]
): boolean {
  if (selected.length === 0) return true;
  const expanded = expandEquipmentFilterKeys(selected);
  if (expanded.length === 0) return true;
  const resolved = new Set(resolveExerciseEquipment(ex));
  return expanded.some((id) => resolved.has(id));
}

export function formatEquipmentLabels(ids: EquipmentId[]): string {
  return ids
    .map((id) => EQUIPMENT_OPTIONS.find((o) => o.id === id)?.label ?? id)
    .join(', ');
}
