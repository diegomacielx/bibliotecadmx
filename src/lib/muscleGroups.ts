import { normalizeString } from './utils';

/** Rótulo canônico por grupo — aliases cobrem variações de digitação na importação/cadastro */
const MUSCLE_CANONICAL_GROUPS: { display: string; aliases: string[] }[] = [
  { display: 'Peitoral', aliases: ['peito', 'peitoral', 'pectoral', 'peitoral maior', 'peitoral menor'] },
  { display: 'Costas', aliases: ['costas', 'dorsal', 'dorsais', 'grande dorsal', 'latissimo', 'latíssimo', 'lat'] },
  { display: 'Quadríceps', aliases: ['quadriceps', 'quadríceps', 'quadricipes', 'vasto', 'reto femoral', 'quadriceps femoral'] },
  { display: 'Posterior de coxa', aliases: ['posterior', 'posteriores', 'isquiotibial', 'isquiotibiais', 'hamstring', 'hamstrings'] },
  { display: 'Glúteos', aliases: ['gluteo', 'glúteo', 'gluteos', 'glúteos', 'gluteo maximo', 'glúteo máximo'] },
  { display: 'Ombros', aliases: ['ombro', 'ombros', 'deltoide', 'deltoides', 'deltóide'] },
  { display: 'Bíceps', aliases: ['biceps', 'bíceps', 'bicep', 'bíceps braquial'] },
  { display: 'Tríceps', aliases: ['triceps', 'tríceps', 'tricep'] },
  { display: 'Antebraço', aliases: ['antebraco', 'antebraço', 'forearm', 'punho'] },
  { display: 'Panturrilha', aliases: ['panturrilha', 'panturrilhas', 'gastrocnemio', 'gastrocnêmio', 'gemeos', 'gêmeos', 'soleo', 'sóleo'] },
  { display: 'Abdômen', aliases: ['abdomen', 'abdômen', 'abdominal', 'abdomen', 'core', 'recto abdominal'] },
  { display: 'Trapézio', aliases: ['trapezio', 'trapézio', 'traps'] },
  { display: 'Lombar', aliases: ['lombar', 'lombares', 'eretor da espinha', 'eretores'] },
  { display: 'Adutores', aliases: ['adutor', 'adutores', 'adutora'] },
  { display: 'Abdutores', aliases: ['abdutor', 'abdutores', 'abdutora'] },
];

const aliasToDisplay = new Map<string, string>();
for (const group of MUSCLE_CANONICAL_GROUPS) {
  for (const alias of group.aliases) {
    aliasToDisplay.set(normalizeString(alias), group.display);
  }
  aliasToDisplay.set(normalizeString(group.display), group.display);
}

/** Capitaliza para exibição quando não há alias canônico */
export function formatMuscleLabel(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return cleaned
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (/^[\s/-]+$/.test(part)) return part;
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join('');
}

/** Resolve um músculo bruto para rótulo padronizado (acentos + capitalização) */
export function resolveMuscleGroup(raw: string): string {
  const norm = normalizeString(raw);
  if (!norm) return '';

  const exact = aliasToDisplay.get(norm);
  if (exact) return exact;

  // Substring conservadora: "quadriceps femoral" → Quadríceps
  for (const [alias, display] of aliasToDisplay.entries()) {
    if (alias.length >= 4 && (norm.includes(alias) || alias.includes(norm))) {
      return display;
    }
  }

  return formatMuscleLabel(raw);
}

/** Normaliza lista para exibição/gravação: trim, canônico, deduplicado */
export function normalizeMuscleGroups(groups: string[] | undefined | null): string[] {
  if (!groups?.length) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of groups) {
    const label = resolveMuscleGroup(String(raw));
    const key = normalizeString(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }

  return result;
}
