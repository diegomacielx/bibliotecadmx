import { normalizeString } from './utils';

/** Rótulo canônico por grupo — aliases cobrem variações de digitação na importação/cadastro */
const MUSCLE_CANONICAL_GROUPS: { display: string; aliases: string[] }[] = [
  { display: 'Peitoral', aliases: ['peito', 'peitoral', 'pectoral', 'peitoral maior', 'peitoral menor'] },
  {
    display: 'Grande dorsal',
    aliases: ['grande dorsal', 'costas', 'dorsal', 'dorsais', 'latissimo', 'latíssimo', 'lat', 'latissimus'],
  },
  {
    display: 'Trapézios / Romboides',
    aliases: ['trapezios', 'trapézios', 'trapezio', 'trapézio', 'traps', 'romboide', 'romboides', 'rombóide'],
  },
  { display: 'Quadríceps', aliases: ['quadriceps', 'quadríceps', 'quadricipes', 'vasto', 'reto femoral', 'quadriceps femoral'] },
  {
    display: 'Posterior de coxa',
    aliases: ['posterior', 'posteriores', 'posterior de coxa', 'isquiotibial', 'isquiotibiais', 'hamstring', 'hamstrings'],
  },
  {
    display: 'Glúteos',
    aliases: ['gluteo', 'glúteo', 'gluteos', 'glúteos'],
  },
  {
    display: 'Glúteo máximo',
    aliases: ['gluteo maximo', 'glúteo máximo', 'gluteo maior', 'glúteo maior', 'glute max'],
  },
  {
    display: 'Glúteo médio',
    aliases: ['gluteo medio', 'glúteo médio', 'glute med', 'glúteo med'],
  },
  { display: 'Ombros', aliases: ['ombro', 'ombros', 'deltoide', 'deltoides', 'deltóide'] },
  { display: 'Bíceps', aliases: ['biceps', 'bíceps', 'bicep', 'bíceps braquial'] },
  { display: 'Tríceps', aliases: ['triceps', 'tríceps', 'tricep'] },
  { display: 'Antebraço', aliases: ['antebraco', 'antebraço', 'forearm', 'punho'] },
  {
    display: 'Músculos da mão',
    aliases: ['mao', 'mão', 'musculos da mao', 'músculos da mão', 'intrinsic hand'],
  },
  {
    display: 'Panturrilha / Perna',
    aliases: ['panturrilha', 'panturrilhas', 'perna', 'pernas', 'gastrocnemio', 'gastrocnêmio', 'gemeos', 'gêmeos', 'soleo', 'sóleo', 'panturrilha / perna'],
  },
  {
    display: 'Gastrocnêmio / Sóleo',
    aliases: ['gastrocnemio', 'gastrocnêmio', 'gastrocnemio / soleo', 'gastrocnêmio / sóleo', 'gemeos', 'gêmeos', 'soleo', 'sóleo', 'panturrilha'],
  },
  {
    display: 'Tibial anterior',
    aliases: ['tibial anterior', 'tibial', 'tibia anterior', 'tíbia anterior', 'canelite', 'shin'],
  },
  {
    display: 'Músculos do pé',
    aliases: ['pe', 'pé', 'musculos do pe', 'músculos do pé', 'intrinsic foot', 'pe intrinseco'],
  },
  {
    display: 'Reto abdominal',
    aliases: ['reto abdominal', 'reto do abdomen', 'abdomen', 'abdômen', 'abdominal', 'recto abdominal', 'six pack'],
  },
  {
    display: 'Oblíquo abdominal',
    aliases: ['obliquo', 'oblíquo', 'obliquo abdominal', 'oblíquo abdominal', 'obliquos', 'oblíquos'],
  },
  {
    display: 'Transverso do abdômen',
    aliases: ['transverso', 'transverso do abdomen', 'transverso abdominal', 'transversus'],
  },
  {
    display: 'Lombar / Paravertebrais',
    aliases: ['lombar', 'lombares', 'eretor da espinha', 'eretores', 'paravertebral', 'paravertebrais', 'lower back'],
  },
  {
    display: 'Assoalho pélvico',
    aliases: ['assoalho pelvico', 'assoalho pélvico', 'pelvic floor', 'kegel'],
  },
  { display: 'Adutores', aliases: ['adutor', 'adutores', 'adutora'] },
  { display: 'Abdutores', aliases: ['abdutor', 'abdutores', 'abdutora'] },
  /** Legado — mantido para dados antigos */
  { display: 'Costas', aliases: [] },
  { display: 'Abdômen', aliases: ['core'] },
  { display: 'Trapézio', aliases: [] },
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
