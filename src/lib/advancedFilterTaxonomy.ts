import type { EquipmentId } from './equipment';

export interface FilterOptionDef {
  id: string;
  label: string;
  description: string;
}

export interface MuscleFilterOptionDef extends FilterOptionDef {
  /** Rótulos canônicos (muscleGroups) que este filtro inclui */
  matchDisplays: string[];
  subOptions?: MuscleFilterOptionDef[];
}

export interface EquipmentFilterOptionDef extends FilterOptionDef {
  equipmentIds: EquipmentId[];
  subOptions?: EquipmentFilterOptionDef[];
}

export interface FilterSectionDef<T extends FilterOptionDef> {
  id: string;
  label: string;
  options: T[];
}

export const MUSCLE_FILTER_SECTIONS: FilterSectionDef<MuscleFilterOptionDef>[] = [
  {
    id: 'inferiores',
    label: 'Membros inferiores',
    options: [
      {
        id: 'quadriceps',
        label: 'Quadríceps',
        description: 'Parte frontal da coxa — extensão do joelho (agachamento, leg press, cadeira extensora).',
        matchDisplays: ['Quadríceps'],
      },
      {
        id: 'posterior_coxa',
        label: 'Posterior de coxa',
        description: 'Isquiotibiais — flexão do joelho e extensão do quadril (stiff, mesa flexora, good morning).',
        matchDisplays: ['Posterior de coxa'],
      },
      {
        id: 'gluteos',
        label: 'Glúteos',
        description: 'Região glútea em geral. Inclui máximo e médio quando não filtrar subgrupo.',
        matchDisplays: ['Glúteos', 'Glúteo máximo', 'Glúteo médio'],
        subOptions: [
          {
            id: 'gluteo_maximo',
            label: 'Glúteo máximo',
            description: 'Glúteo maior — extensão e rotação externa do quadril (hip thrust, elevação pélvica).',
            matchDisplays: ['Glúteo máximo', 'Glúteos'],
          },
          {
            id: 'gluteo_medio',
            label: 'Glúteo médio',
            description: 'Estabiliza pelve e abduz o quadril — lateral walk, abdução na polia ou cabo.',
            matchDisplays: ['Glúteo médio', 'Glúteos'],
          },
        ],
      },
      {
        id: 'adutores',
        label: 'Adutores',
        description: 'Parte interna da coxa — aproxima as pernas (cadeira adutora, afundo lateral).',
        matchDisplays: ['Adutores'],
      },
      {
        id: 'abdutores',
        label: 'Abdutores',
        description: 'Parte lateral do quadril — afasta a perna do corpo (abdução na polia, mini band lateral).',
        matchDisplays: ['Abdutores'],
      },
      {
        id: 'panturrilha_perna',
        label: 'Panturrilha / Perna',
        description: 'Região da panturrilha e da perna distal — inclui gastrocnêmio, sóleo e tibial.',
        matchDisplays: ['Panturrilha / Perna', 'Gastrocnêmio / Sóleo', 'Tibial anterior'],
        subOptions: [
          {
            id: 'gastrocnemio_soleo',
            label: 'Gastrocnêmio / Sóleo',
            description: 'Panturrilha — flexão plantar do tornozelo (elevação de calcanhar, leg press de panturrilha).',
            matchDisplays: ['Gastrocnêmio / Sóleo', 'Panturrilha / Perna'],
          },
          {
            id: 'tibial_anterior',
            label: 'Tibial anterior',
            description: 'Parte frontal da perna — dorsiflexão do tornozelo; relevante para canelite e corrida.',
            matchDisplays: ['Tibial anterior', 'Panturrilha / Perna'],
          },
        ],
      },
      {
        id: 'musculos_pe',
        label: 'Músculos do pé',
        description: 'Intrínsecos do pé — estabilidade, propulsão e controle fino (toe raises, band exercises).',
        matchDisplays: ['Músculos do pé'],
      },
    ],
  },
  {
    id: 'superiores',
    label: 'Membros superiores',
    options: [
      {
        id: 'peitoral',
        label: 'Peitoral',
        description: 'Peito — empurrar horizontal ou inclinado (supino, crucifixo, flexão de braço).',
        matchDisplays: ['Peitoral'],
      },
      {
        id: 'grande_dorsal',
        label: 'Grande dorsal',
        description: 'Costas largas — puxadas verticais e horizontais (barra fixa, remada, pulldown).',
        matchDisplays: ['Grande dorsal', 'Costas'],
      },
      {
        id: 'trapezios_romboides',
        label: 'Trapézios / Romboides',
        description: 'Parte superior e média das costas — encolhimento, remada alta, face pull.',
        matchDisplays: ['Trapézios / Romboides', 'Trapézio'],
      },
      {
        id: 'ombros',
        label: 'Ombros',
        description: 'Deltoides — elevação frontal, lateral e desenvolvimento (press, elevações).',
        matchDisplays: ['Ombros'],
      },
      {
        id: 'biceps',
        label: 'Bíceps',
        description: 'Parte frontal do braço — flexão do cotovelo (rosca direta, martelo, scott).',
        matchDisplays: ['Bíceps'],
      },
      {
        id: 'triceps',
        label: 'Tríceps',
        description: 'Parte posterior do braço — extensão do cotovelo (tríceps testa, corda, fundos).',
        matchDisplays: ['Tríceps'],
      },
      {
        id: 'antebraco',
        label: 'Antebraço',
        description: 'Antebraços e punho — flexão/extensão de punho, pegada (rosca inversa, farmer walk).',
        matchDisplays: ['Antebraço'],
      },
      {
        id: 'musculos_mao',
        label: 'Músculos da mão',
        description: 'Músculos intrínsecos da mão — pegada fina, preensão e controle de dedos.',
        matchDisplays: ['Músculos da mão'],
      },
    ],
  },
  {
    id: 'core',
    label: 'Core / Tronco',
    options: [
      {
        id: 'reto_abdominal',
        label: 'Reto abdominal',
        description: '“Six pack” — flexão da coluna (crunch, sit-up, ab rollout).',
        matchDisplays: ['Reto abdominal', 'Abdômen'],
      },
      {
        id: 'obliquo_abdominal',
        label: 'Oblíquo abdominal',
        description: 'Laterais do tronco — rotação e inclinação (russian twist, side plank).',
        matchDisplays: ['Oblíquo abdominal', 'Abdômen'],
      },
      {
        id: 'transverso_abdomen',
        label: 'Transverso do abdômen',
        description: 'Camada profunda do core — estabilização e cintura (vacuum, prancha, dead bug).',
        matchDisplays: ['Transverso do abdômen', 'Abdômen'],
      },
      {
        id: 'lombar_paravertebrais',
        label: 'Lombar / Paravertebrais',
        description: 'Região lombar e eretores — extensão da coluna (hiperextensão, good morning, stiff).',
        matchDisplays: ['Lombar / Paravertebrais', 'Lombar'],
      },
      {
        id: 'assoalho_pelvico',
        label: 'Assoalho pélvico',
        description: 'Músculos do assoalho pélvico — estabilidade pélvica e controle intra-abdominal.',
        matchDisplays: ['Assoalho pélvico'],
      },
    ],
  },
];

export const EQUIPMENT_FILTER_OPTIONS: EquipmentFilterOptionDef[] = [
  {
    id: 'pesos_livres',
    label: 'Pesos livres',
    description: 'Barra, halteres e kettlebell — movimentos livres com carga externa.',
    equipmentIds: ['barra', 'halter', 'kettlebell'],
    subOptions: [
      {
        id: 'pesos_livres_barra',
        label: 'Barra',
        description: 'Barra olímpica ou reta — supino, agachamento, terra, remadas.',
        equipmentIds: ['barra'],
      },
      {
        id: 'pesos_livres_halter',
        label: 'Halter',
        description: 'Halteres — unilateral, amplitude livre e estabilização extra.',
        equipmentIds: ['halter'],
      },
      {
        id: 'pesos_livres_kettlebell',
        label: 'Kettlebell',
        description: 'Peso russo — balístico, core e condicionamento (swing, turkish get-up).',
        equipmentIds: ['kettlebell'],
      },
    ],
  },
  {
    id: 'cabos_polias',
    label: 'Cabos e polias',
    description: 'Puxadas, remadas baixas, crossover, voador e exercícios na polia.',
    equipmentIds: ['cabo'],
  },
  {
    id: 'maquinas_articulados',
    label: 'Máquinas e articulados',
    description: 'Aparelhos guiados ou seletorizados — Smith, cadeiras, hack, leg press.',
    equipmentIds: ['maquina', 'smith'],
  },
  {
    id: 'peso_corporal_calistenia',
    label: 'Peso corporal / Calistenia',
    description: 'Corpo como resistência — flexão, barra fixa, paralelas, prancha.',
    equipmentIds: ['peso_corporal'],
  },
  {
    id: 'elasticos_bands',
    label: 'Elásticos / Mini bands',
    description: 'Faixas elásticas — aquecimento, reabilitação, ativação e treino funcional.',
    equipmentIds: ['elastico'],
  },
];

/** Mapa plano de todos os filtros musculares (inclui subgrupos) */
const muscleFilterMap = new Map<string, MuscleFilterOptionDef>();

for (const section of MUSCLE_FILTER_SECTIONS) {
  for (const option of section.options) {
    muscleFilterMap.set(option.id, option);
    option.subOptions?.forEach((sub) => muscleFilterMap.set(sub.id, sub));
  }
}

export function getMuscleFilterDef(id: string): MuscleFilterOptionDef | undefined {
  return muscleFilterMap.get(id);
}

export function getAllMuscleFilterOptions(): MuscleFilterOptionDef[] {
  return [...muscleFilterMap.values()];
}

/** Mapa plano de filtros de equipamento */
const equipmentFilterMap = new Map<string, EquipmentFilterOptionDef>();

for (const option of EQUIPMENT_FILTER_OPTIONS) {
  equipmentFilterMap.set(option.id, option);
  option.subOptions?.forEach((sub) => equipmentFilterMap.set(sub.id, sub));
}

export function getEquipmentFilterDef(id: string): EquipmentFilterOptionDef | undefined {
  return equipmentFilterMap.get(id);
}

export function expandEquipmentFilterKeys(selected: string[]): EquipmentId[] {
  const ids = new Set<EquipmentId>();
  for (const key of selected) {
    const def = equipmentFilterMap.get(key);
    if (def) {
      def.equipmentIds.forEach((id) => ids.add(id));
    }
    // Legado: ids antigos gravados diretamente (barra, cabo, etc.)
    if (!def && /^[a-z_]+$/.test(key)) {
      ids.add(key as EquipmentId);
    }
  }
  return [...ids];
}

/** Converte rótulos legados salvos no localStorage para ids atuais */
export const LEGACY_MUSCLE_FILTER_MAP: Record<string, string> = {
  Peitoral: 'peitoral',
  Costas: 'grande_dorsal',
  Quadríceps: 'quadriceps',
  'Posterior de coxa': 'posterior_coxa',
  Glúteos: 'gluteos',
  Ombros: 'ombros',
  Bíceps: 'biceps',
  Tríceps: 'triceps',
  Antebraço: 'antebraco',
  Panturrilha: 'panturrilha_perna',
  Abdômen: 'reto_abdominal',
  Trapézio: 'trapezios_romboides',
  Lombar: 'lombar_paravertebrais',
  Adutores: 'adutores',
  Abdutores: 'abdutores',
};

export const LEGACY_EQUIPMENT_FILTER_MAP: Record<string, string> = {
  barra: 'pesos_livres_barra',
  halter: 'pesos_livres_halter',
  smith: 'maquinas_articulados',
  maquina: 'maquinas_articulados',
  cabo: 'cabos_polias',
  peso_corporal: 'peso_corporal_calistenia',
};

export function normalizeMuscleFilterIds(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const mapped = LEGACY_MUSCLE_FILTER_MAP[item] ?? item;
    if (muscleFilterMap.has(mapped) && !seen.has(mapped)) {
      seen.add(mapped);
      result.push(mapped);
    }
  }
  return result;
}

export function normalizeEquipmentFilterIds(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    const mapped = LEGACY_EQUIPMENT_FILTER_MAP[item] ?? item;
    if (equipmentFilterMap.has(mapped) && !seen.has(mapped)) {
      seen.add(mapped);
      result.push(mapped);
    } else if (!equipmentFilterMap.has(mapped) && !seen.has(item)) {
      // mantém id legado de equipamento para expandEquipmentFilterKeys
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}
