import type { Exercise } from '../types';
import { normalizeString } from './utils';

/** Sinônimos comuns (PT-BR fitness) para ampliar recall */
const SYNONYM_GROUPS: string[][] = [
  ['peito', 'peitoral', 'pectoral'],
  ['costas', 'dorsal', 'dorsais', 'latissimo', 'grande dorsal'],
  ['perna', 'pernas', 'lower'],
  ['quadriceps', 'quadríceps', 'quadricipes', 'vasto', 'recto femoral'],
  ['posterior', 'posteriores', 'isquiotibial', 'hamstring'],
  ['gluteo', 'glúteos', 'gluteos', 'bumbum'],
  ['ombro', 'ombros', 'deltoide', 'deltoides'],
  ['biceps', 'bíceps', 'bicep'],
  ['triceps', 'tríceps', 'tricep'],
  ['antebraco', 'antebraço', 'forearm'],
  ['panturrilha', 'gastrocnemio', 'gemio'],
  ['abdomen', 'abdômen', 'core', 'abdominal'],
  ['agachamento', 'squat', 'agachar'],
  ['supino', 'bench', 'peito reto'],
  ['puxada', 'pulldown', 'barra fixa', 'pullup'],
  ['remada', 'row', 'remo'],
  ['leg press', 'legpress', 'press 45'],
  ['extensora', 'extensao de joelho', 'cadeira extensora'],
  ['flexora', 'flexao de joelho', 'mesa flexora'],
  ['elevacao', 'elevação', 'elevacao lateral', 'lateral raise'],
  ['rosca', 'curl'],
  ['triceps', 'triceps testa', 'frances'],
];

const synonymMap = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  const normalized = group.map((w) => normalizeString(w));
  for (const word of normalized) {
    synonymMap.set(word, normalized.filter((w) => w !== word));
  }
}

export interface ExerciseSearchIndex {
  exercise: Exercise;
  idNorm: string;
  nameNorm: string;
  categoryNorm: string;
  keywordsNorm: string[];
  musclesNorm: string[];
  /** Tokens do nome para match por palavra */
  nameWords: string[];
  /** Blob concatenado para busca ampla */
  blob: string;
}

export function buildExerciseSearchIndex(ex: Exercise): ExerciseSearchIndex {
  const idNorm = normalizeString(String(ex.id || ''));
  const nameNorm = normalizeString(String(ex.name || ''));
  const categoryNorm = normalizeString(String(ex.category || ''));
  const keywordsNorm = (ex.keywords || []).map((k) => normalizeString(String(k))).filter(Boolean);
  const musclesNorm = (ex.muscleGroups || []).map((m) => normalizeString(String(m))).filter(Boolean);
  const nameWords = nameNorm.split(/[\s\-_/]+/).filter((w) => w.length > 1);

  const blob = [idNorm, nameNorm, categoryNorm, ...keywordsNorm, ...musclesNorm].join(' ');

  return { exercise: ex, idNorm, nameNorm, categoryNorm, keywordsNorm, musclesNorm, nameWords, blob };
}

export interface ParsedQuery {
  /** Termos obrigatórios (AND) */
  terms: string[];
  /** Frase exata entre aspas */
  phrase: string | null;
  raw: string;
}

export function parseSearchQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  const phraseMatch = trimmed.match(/"([^"]+)"/);
  const phrase = phraseMatch ? normalizeString(phraseMatch[1]) : null;
  const withoutPhrase = phraseMatch ? trimmed.replace(/"([^"]+)"/, ' ').trim() : trimmed;

  const terms = withoutPhrase
    .split(/[\s+&]+|\band\b|,|;|\//gi)
    .map((t) => normalizeString(t))
    .filter((t) => t.length > 0);

  return { terms, phrase, raw: trimmed };
}

function expandTerm(term: string): string[] {
  const base = normalizeString(term);
  if (!base) return [];
  const syns = synonymMap.get(base) || [];
  return [base, ...syns];
}

/** Distância de Levenshtein otimizada para fuzzy curto */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 + Math.min(prev, row[j], row[j - 1]);
      prev = temp;
    }
  }
  return row[b.length];
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (!needle || !haystack) return false;
  if (haystack.includes(needle)) return true;
  if (needle.length < 4) return false;

  const maxDist = needle.length <= 5 ? 1 : needle.length <= 8 ? 2 : 2;
  const words = haystack.split(/[\s\-_/]+/);
  for (const word of words) {
    if (word.length === 0) continue;
    if (Math.abs(word.length - needle.length) > maxDist) continue;
    if (levenshtein(word, needle) <= maxDist) return true;
  }
  return levenshtein(haystack.slice(0, needle.length + maxDist), needle) <= maxDist;
}

function scoreTermAgainstIndex(term: string, idx: ExerciseSearchIndex): number {
  let best = 0;

  for (const t of expandTerm(term)) {
    if (!t) continue;

    if (idx.idNorm === t) best = Math.max(best, 1200);
    else if (idx.idNorm.startsWith(t)) best = Math.max(best, 900);
    else if (idx.idNorm.includes(t)) best = Math.max(best, 600);

    if (idx.nameNorm === t) best = Math.max(best, 800);
    else if (idx.nameWords.some((w) => w === t)) best = Math.max(best, 650);
    else if (idx.nameNorm.startsWith(t)) best = Math.max(best, 550);
    else if (idx.nameWords.some((w) => w.startsWith(t))) best = Math.max(best, 480);
    else if (idx.nameNorm.includes(t)) best = Math.max(best, 350);

    if (idx.keywordsNorm.some((k) => k === t)) best = Math.max(best, 500);
    else if (idx.keywordsNorm.some((k) => k.startsWith(t) || k.includes(t))) best = Math.max(best, 280);

    if (idx.musclesNorm.some((m) => m === t || m.includes(t))) best = Math.max(best, 320);
    else if (idx.musclesNorm.some((m) => m.startsWith(t))) best = Math.max(best, 260);

    if (idx.categoryNorm === t || idx.categoryNorm.includes(t)) best = Math.max(best, 200);

    if (idx.blob.includes(t)) best = Math.max(best, 150);

    if (best < 120 && t.length >= 4) {
      if (fuzzyIncludes(idx.nameNorm, t)) best = Math.max(best, 100);
      else if (idx.keywordsNorm.some((k) => fuzzyIncludes(k, t))) best = Math.max(best, 80);
      else if (idx.musclesNorm.some((m) => fuzzyIncludes(m, t))) best = Math.max(best, 70);
    }
  }

  return best;
}

function scorePhrase(index: ExerciseSearchIndex, phrase: string): number {
  if (!phrase) return 0;
  if (index.nameNorm.includes(phrase)) return 400;
  if (index.blob.includes(phrase)) return 200;
  return 0;
}

export interface RankedExercise {
  exercise: Exercise;
  score: number;
  /** Termos que contribuíram (debug / UI) */
  matchedTerms: string[];
}

export function rankExercises(
  indexes: ExerciseSearchIndex[],
  query: string
): RankedExercise[] {
  const parsed = parseSearchQuery(query);
  if (!parsed.terms.length && !parsed.phrase) {
    return indexes.map((idx) => ({ exercise: idx.exercise, score: 0, matchedTerms: [] }));
  }

  const results: RankedExercise[] = [];

  for (const idx of indexes) {
    let totalScore = 0;
    const matchedTerms: string[] = [];

    if (parsed.phrase && !idx.nameNorm.includes(parsed.phrase) && !idx.blob.includes(parsed.phrase)) {
      continue;
    }
    if (parsed.phrase) totalScore += scorePhrase(idx, parsed.phrase);

    if (parsed.terms.length === 0 && parsed.phrase) {
      results.push({ exercise: idx.exercise, score: totalScore, matchedTerms: [parsed.phrase] });
      continue;
    }

    let allTermsMatch = true;
    for (const term of parsed.terms) {
      const termScore = scoreTermAgainstIndex(term, idx);
      if (termScore <= 0) {
        allTermsMatch = false;
        break;
      }
      totalScore += termScore;
      matchedTerms.push(term);
    }

    if (!allTermsMatch) continue;

    results.push({ exercise: idx.exercise, score: totalScore, matchedTerms });
  }

  results.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name, 'pt-BR'));
  return results;
}

export function filterExercisesByCategory(
  items: Exercise[],
  activeCategory: string,
  favoriteIds?: Set<string>
): Exercise[] {
  if (activeCategory === 'Favoritos') {
    if (!favoriteIds?.size) return [];
    return items.filter((ex) => favoriteIds.has(ex.firestoreId));
  }
  if (activeCategory === 'Todos') return items;
  return items.filter((ex) => ex.category === activeCategory);
}

/** Destaque rotativo: muda 1x por dia (estável durante o dia) */
export function pickDailyFeaturedExercise(pool: Exercise[], date = new Date()): Exercise | null {
  if (pool.length === 0) return null;
  const dayKey = date.toISOString().slice(0, 10);
  let hash = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    hash ^= dayKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
}
