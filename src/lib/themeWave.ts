import { applyTheme, THEME_STORAGE_KEY, type ThemeMode } from './theme';

/* ──────────────────────────────────────────────────────────────────────────
 * Transição de tema "rodo / squeegee" — arquitetura DUAL-LAYER + CLIP-PATH
 * ──────────────────────────────────────────────────────────────────────────
 * Em vez de animar `color` de cada letra (sequencial, com lag e impossível de
 * cortar uma letra ao meio), montamos DUAS camadas visualmente idênticas:
 *
 *   • BASE  → a aplicação real, já no tema NOVO.
 *   • TOPO  → um clone visual pintado no tema ANTIGO, sobreposto (inset:0).
 *
 * A camada de topo é recortada por `clip-path` cuja borda acompanha, pixel a
 * pixel, a posição do "rodo". Onde o rodo já passou, o clone (tema antigo)
 * some e o tema novo aparece por baixo — então UMA letra pode ficar metade
 * num tema e metade no outro exatamente sobre a borda do recorte.
 *
 * Como o tema é definido por `html[data-theme]`, as duas camadas ficariam no
 * MESMO tema. Resolvemos congelando os valores das CSS vars do tema antigo
 * inline na camada de topo (snapshotThemeVars), de modo que os dois temas
 * coexistam sob o mesmo <html>.
 * ────────────────────────────────────────────────────────────────────────── */

export const THEME_WAVE_MS = 3000;
const SQUEEGEE_WIDTH = 130;
const WAVE_EASING = 'cubic-bezier(0.4, 0.0, 0.2, 1)';

type WaveHandles = {
  overlay: HTMLDivElement;
  stage: HTMLDivElement;
  squeegee: HTMLDivElement;
  animations: Animation[];
};

let active: WaveHandles | null = null;
let generation = 0;
let safetyTimer = 0;
let cachedVarNames: string[] | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isThemeWaveActive(): boolean {
  return active !== null;
}

/** Lê os nomes de todas as CSS custom properties --dmx-* das folhas de estilo. */
function collectThemeVarNames(): string[] {
  if (cachedVarNames) return cachedVarNames;

  const names = new Set<string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | undefined;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // folha cross-origin (ex.: Google Fonts)
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const { style } = rule;
      for (let i = 0; i < style.length; i += 1) {
        const prop = style[i];
        if (prop.startsWith('--dmx-')) names.add(prop);
      }
    }
  }

  cachedVarNames = Array.from(names);
  return cachedVarNames;
}

/** Congela os valores resolvidos das vars do tema ATUAL (antes da troca). */
function snapshotThemeVars(): Record<string, string> {
  const computed = getComputedStyle(document.documentElement);
  const snapshot: Record<string, string> = {};
  for (const name of collectThemeVarNames()) {
    const value = computed.getPropertyValue(name);
    if (value) snapshot[name] = value;
  }
  return snapshot;
}

function persist(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function teardown(): void {
  if (safetyTimer) {
    window.clearTimeout(safetyTimer);
    safetyTimer = 0;
  }
  if (!active) return;
  for (const animation of active.animations) {
    animation.cancel();
  }
  active.overlay.remove();
  active = null;
}

/**
 * Pina elementos sticky/fixed do clone na posição de tela atual.
 * O clone vive num stage deslocado por -scrollY; um header sticky renderizaria
 * no topo do documento. Reposicionamos em coordenadas de documento para que
 * apareça exatamente onde está na tela.
 */
function pinFloatingElements(clone: HTMLElement): void {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  const liveFloating = Array.from(document.querySelectorAll<HTMLElement>('.site-header'));
  const cloneFloating = Array.from(clone.querySelectorAll<HTMLElement>('.site-header'));

  liveFloating.forEach((liveEl, index) => {
    const cloneEl = cloneFloating[index];
    if (!cloneEl) return;
    const rect = liveEl.getBoundingClientRect();
    cloneEl.style.position = 'absolute';
    cloneEl.style.top = `${rect.top + scrollY}px`;
    cloneEl.style.left = `${rect.left + scrollX}px`;
    cloneEl.style.width = `${rect.width}px`;
    cloneEl.style.margin = '0';
  });
}

function buildOverlay(fromMode: ThemeMode, fromVars: Record<string, string>): WaveHandles | null {
  const liveRoot = document.getElementById('root');
  if (!liveRoot) return null;

  const overlay = document.createElement('div');
  overlay.className = 'dmx-theme-wave';
  overlay.setAttribute('aria-hidden', 'true');

  // Camada de topo (tema ANTIGO congelado) ----------------------------------
  const stage = document.createElement('div');
  stage.className = 'dmx-theme-wave__stage';
  stage.dataset.theme = fromMode;
  stage.style.colorScheme = fromMode;
  for (const [name, value] of Object.entries(fromVars)) {
    stage.style.setProperty(name, value);
  }
  stage.style.top = `${-window.scrollY}px`;
  stage.style.left = `${-window.scrollX}px`;
  stage.style.width = `${document.documentElement.clientWidth}px`;

  const clone = liveRoot.cloneNode(true) as HTMLElement;
  clone.removeAttribute('id');
  pinFloatingElements(clone);
  stage.appendChild(clone);

  // O rodo (squeegee) — vive FORA do clip, sempre visível na borda -----------
  const squeegee = document.createElement('div');
  squeegee.className = 'dmx-theme-wave__squeegee';
  squeegee.style.width = `${SQUEEGEE_WIDTH}px`;

  overlay.append(stage, squeegee);
  document.body.appendChild(overlay);

  return { overlay, stage, squeegee, animations: [] };
}

function run(nextMode: ThemeMode): Promise<void> {
  if (prefersReducedMotion()) {
    teardown();
    applyTheme(nextMode);
    persist(nextMode);
    return Promise.resolve();
  }

  const fromMode = (document.documentElement.dataset.theme as ThemeMode) || nextMode;
  const fromVars = snapshotThemeVars();

  // Reinício imediato em trocas rápidas: derruba a onda anterior.
  teardown();

  const handles = buildOverlay(fromMode, fromVars);
  if (!handles) {
    applyTheme(nextMode);
    persist(nextMode);
    return Promise.resolve();
  }

  active = handles;
  generation += 1;
  const myGeneration = generation;

  // BASE passa a ser o tema novo (revelado por baixo do clone antigo).
  applyTheme(nextMode);

  // Direção: invertida entre claro→escuro e escuro→claro.
  const leftToRight = nextMode === 'dark';

  // Recorte que apaga o clone (tema antigo) por onde o rodo passa.
  const clipFrames = leftToRight
    ? ['inset(0 0 0 0)', 'inset(0 0 0 100%)'] // apaga a partir da esquerda
    : ['inset(0 0 0 0)', 'inset(0 100% 0 0)']; // apaga a partir da direita

  // Rodo acompanha a borda do recorte, da esquerda→direita (ou inverso).
  const squeegeeFrames = leftToRight
    ? ['translateX(-50%)', 'translateX(calc(100vw - 50%))']
    : ['translateX(calc(100vw - 50%))', 'translateX(-50%)'];

  handles.stage.style.clipPath = clipFrames[0];

  const timing: KeyframeAnimationOptions = {
    duration: THEME_WAVE_MS,
    easing: WAVE_EASING,
    fill: 'forwards',
  };

  const stageAnim = handles.stage.animate(
    clipFrames.map((clipPath) => ({ clipPath })),
    timing
  );
  const squeegeeAnim = handles.squeegee.animate(
    squeegeeFrames.map((transform) => ({ transform })),
    timing
  );

  handles.animations = [stageAnim, squeegeeAnim];

  return new Promise((resolve) => {
    const finish = () => {
      if (myGeneration !== generation) {
        resolve();
        return;
      }
      teardown();
      resolve();
    };

    stageAnim.addEventListener('finish', finish, { once: true });

    safetyTimer = window.setTimeout(finish, THEME_WAVE_MS + 250);
  });
}

export function runThemeWaveTransition(nextMode: ThemeMode): Promise<void> {
  return run(nextMode);
}
