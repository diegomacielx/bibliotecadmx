import type { Exercise } from '../types';
import { normalizeString } from './utils';

/**
 * Foco vertical da capa (object-position Y).
 * 0 = topo · 50 = centro · 100 = base
 *
 * Membro superior: corpo centralizado no enquadramento (~45%)
 * Deadlift / stiff / RDL: ação na região central do corpo (~65%)
 * Membro inferior: prioriza pés/pernas, evita cortar joelhos (~73%)
 * Barra fixa / pull-up: cabeça no topo do quadro (~24%)
 */
export const COVER_FOCUS = {
  HANGING: 24,
  UPPER: 45,
  HINGE: 65,
  LOWER: 73,
} as const;

type FocusRule = { focusY: number; keywords: string[] };

/** Exercícios pendurados — cabeça perto do topo do quadro original */
const HANGING: FocusRule = {
  focusY: COVER_FOCUS.HANGING,
  keywords: [
    'barra fixa',
    'pull up',
    'pull-up',
    'pullup',
    'chin up',
    'chin-up',
    'chinup',
    'graviton',
    'pegada pronada',
    'pegada supinada',
  ],
};

/** Padrões de levantamento terra / stiff / RDL — foco no centro do movimento */
const HINGE: FocusRule = {
  focusY: COVER_FOCUS.HINGE,
  keywords: [
    'deadlift',
    'dead lift',
    'levantamento terra',
    'terra stiff',
    'terra romeno',
    'terra rumeno',
    'stiff',
    'stiffed',
    'rdl',
    'rdll',
    'romanian',
    'rumeno',
    'good morning',
    'good-morning',
    'hip hinge',
    'barra no chao',
    'barra no chão',
  ],
};

/**
 * Membros inferiores — enquadramento completo; object-position mais baixo
 * para preservar pés/joelhos no crop 4:5.
 */
const LOWER_BODY: FocusRule = {
  focusY: COVER_FOCUS.LOWER,
  keywords: [
    'agachamento',
    'agachamento livre',
    'agachamento frontal',
    'agachamento hack',
    'squat',
    'sissy',
    'hack squat',
    'leg press',
    'press 45',
    'press de pernas',
    'cadeira extensora',
    'extensora',
    'extensao de joelho',
    'extensão de joelho',
    'cadeira flexora',
    'mesa flexora',
    'flexora',
    'flexao de joelho',
    'flexão de joelho',
    'afundo',
    'lunge',
    'passada',
    'avanco',
    'avanço',
    'bulgaro',
    'búlgaro',
    'split squat',
    'passada bulgara',
    'panturrilha',
    'panturrilha no',
    'elevacao de panturrilha',
    'elevação de panturrilha',
    'calf raise',
    'gemeo',
    'gêmeo',
    'adutor',
    'abdutor',
    'cadeira adutora',
    'hip thrust',
    'elevar quadril',
    'elevacao pelvica',
    'elevação pélvica',
    'glute bridge',
    'ponte de gluteo',
    'smith agachamento',
    'v squat',
    'leg curl',
    'leg extension',
    'abdomen infra',
    'abdominal infra',
  ],
};

/** Membros superiores — corpo centralizado (padrão mais comum) */
const UPPER_BODY: FocusRule = {
  focusY: COVER_FOCUS.UPPER,
  keywords: [
    'supino',
    'bench',
    'crucifixo',
    'fly',
    'crossover',
    'peito',
    'peitoral',
    'remada',
    'row',
    'puxada',
    'pulldown',
    'desenvolvimento',
    'elevacao lateral',
    'elevação lateral',
    'elevacao frontal',
    'elevação frontal',
    'rosca',
    'curl',
    'triceps',
    'tríceps',
    'tricep',
    'testa',
    'frances',
    'francês',
    'corda',
    'ombro',
    'deltoide',
    'costas',
    'dorsal',
    'biceps',
    'bíceps',
    'mergulho',
    'paralela',
    'pullover',
    'face pull',
  ],
};

/** Grupos musculares que indicam foco inferior */
const LOWER_MUSCLE_GROUPS = [
  'quadriceps',
  'quadríceps',
  'posterior de coxa',
  'posteriores',
  'gluteos',
  'glúteos',
  'panturrilha',
  'panturrilhas',
  'adutores',
  'abdutores',
];

/** Grupos musculares que indicam foco superior centralizado */
const UPPER_MUSCLE_GROUPS = [
  'peitoral',
  'peito',
  'costas',
  'dorsal',
  'ombros',
  'ombro',
  'biceps',
  'bíceps',
  'triceps',
  'tríceps',
  'antebraco',
  'antebraço',
  'trapezio',
  'trapézio',
];

const LOWER_CATEGORIES = [
  'quadriceps',
  'quadríceps',
  'posteriores',
  'posterior de coxa',
  'gluteos',
  'glúteos',
  'adutores',
  'panturrilha',
  'panturrilhas',
  'pernas',
  'membros inferiores',
  'inferiores',
];

const UPPER_CATEGORIES = [
  'peitoral',
  'peito',
  'costas',
  'ombros',
  'ombro',
  'biceps',
  'bíceps',
  'triceps',
  'tríceps',
  'antebraco',
  'antebraço',
  'trapezio',
  'trapézio',
  'membros superiores',
  'superiores',
];

const CORE_CATEGORIES = ['core', 'abdomen', 'abdômen', 'abdominal'];

const RULES_IN_PRIORITY: FocusRule[] = [HINGE, LOWER_BODY, UPPER_BODY];

function buildSearchBlob(
  ex: Pick<Exercise, 'name' | 'category' | 'muscleGroups' | 'keywords'>
): string {
  const muscles = Array.isArray(ex.muscleGroups) ? ex.muscleGroups.join(' ') : '';
  const keywords = Array.isArray(ex.keywords) ? ex.keywords.join(' ') : '';
  return normalizeString(`${ex.name} ${ex.category} ${muscles} ${keywords}`);
}

function matchesKeyword(blob: string, keyword: string): boolean {
  const key = normalizeString(keyword);
  if (!key) return false;
  if (key.includes(' ')) return blob.includes(key);
  const tokens = blob.split(/\s+/);
  return tokens.some((t) => t === key || t.startsWith(key) || key.startsWith(t));
}

function matchesAny(blob: string, keywords: string[]): boolean {
  return keywords.some((k) => matchesKeyword(blob, k));
}

function matchesMuscleGroup(muscles: string[] | undefined, groups: string[]): boolean {
  if (!muscles?.length) return false;
  const normalized = muscles.map((m) => normalizeString(m));
  return groups.some((g) => normalized.some((m) => m.includes(normalizeString(g))));
}

function focusFromCategory(category: string): number | null {
  const norm = normalizeString(category);
  if (!norm) return null;

  if (LOWER_CATEGORIES.some((c) => norm.includes(normalizeString(c)))) {
    return COVER_FOCUS.LOWER;
  }
  if (UPPER_CATEGORIES.some((c) => norm.includes(normalizeString(c)))) {
    return COVER_FOCUS.UPPER;
  }
  if (CORE_CATEGORIES.some((c) => norm.includes(normalizeString(c)))) {
    return COVER_FOCUS.HINGE;
  }
  return null;
}

function resolveHeuristicFocusY(
  ex: Pick<Exercise, 'name' | 'category' | 'muscleGroups' | 'keywords'>
): number {
  const blob = buildSearchBlob(ex);

  if (matchesAny(blob, HANGING.keywords)) {
    return HANGING.focusY;
  }

  for (const rule of RULES_IN_PRIORITY) {
    if (matchesAny(blob, rule.keywords)) {
      return rule.focusY;
    }
  }

  const fromCategory = focusFromCategory(ex.category);
  if (fromCategory !== null) {
    return fromCategory;
  }

  if (matchesMuscleGroup(ex.muscleGroups, LOWER_MUSCLE_GROUPS)) {
    return COVER_FOCUS.LOWER;
  }

  if (matchesMuscleGroup(ex.muscleGroups, UPPER_MUSCLE_GROUPS)) {
    return COVER_FOCUS.UPPER;
  }

  return COVER_FOCUS.UPPER;
}

/**
 * Define o ponto focal vertical da capa (object-position).
 * Prioridade: `coverFocusY` manual → heurística por nome/categoria/músculos.
 */
export function getCoverObjectPosition(
  ex: Pick<Exercise, 'name' | 'category' | 'muscleGroups' | 'keywords' | 'coverFocusY'>
): string {
  if (typeof ex.coverFocusY === 'number' && Number.isFinite(ex.coverFocusY)) {
    const y = Math.min(100, Math.max(0, ex.coverFocusY));
    return `center ${y}%`;
  }

  const focusY = resolveHeuristicFocusY(ex);
  return `center ${focusY}%`;
}

/** Retorna só o valor Y (útil para debug/admin) */
export function getCoverFocusY(
  ex: Pick<Exercise, 'name' | 'category' | 'muscleGroups' | 'keywords' | 'coverFocusY'>
): number {
  if (typeof ex.coverFocusY === 'number' && Number.isFinite(ex.coverFocusY)) {
    return Math.min(100, Math.max(0, ex.coverFocusY));
  }
  return resolveHeuristicFocusY(ex);
}

/** Converte input do admin (string vazia = automático) */
export function parseCoverFocusYInput(raw: string | undefined | null): number | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function formatCoverFocusYInput(value: number | undefined | null): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.min(100, Math.max(0, Math.round(value))));
  }
  return '';
}
