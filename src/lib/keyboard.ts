/** Ignora atalhos quando o usuário está digitando em um campo */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

export function modKeyLabel(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

/** Tecla ` / acento grave — mesma posição física em QWERTY, ABNT2, AZERTY, etc. */
export function isBackquoteKey(e: KeyboardEvent): boolean {
  return e.code === 'Backquote' || e.code === 'IntlBackslash';
}

/** Atalhos de catálogo usam Ctrl (não ⌘) para evitar conflitos do sistema, ex. Cmd+` no macOS. */
export function isCatalogShortcutMod(e: KeyboardEvent): boolean {
  return e.ctrlKey && !e.metaKey && !e.altKey;
}

export type ShortcutKey = string;

export interface ShortcutItem {
  id: string;
  label: string;
  keys: ShortcutKey[];
  /** Só aparece quando a condição é verdadeira */
  when?: boolean;
}

export interface ShortcutSection {
  id: string;
  title: string;
  items: ShortcutItem[];
}

export function buildShortcutSections(options: {
  hasLightboxNav: boolean;
  hasCompare: boolean;
  isAdmin: boolean;
}): ShortcutSection[] {
  const mod = modKeyLabel();

  const sections: ShortcutSection[] = [
    {
      id: 'general',
      title: 'Geral',
      items: [
        { id: 'search', label: 'Focar na busca', keys: [mod, 'K'] },
        { id: 'shortcuts', label: 'Abrir este painel', keys: ['?'] },
        { id: 'shortcuts-alt', label: 'Abrir este painel (alternativo)', keys: [mod, '/'] },
        { id: 'escape', label: 'Fechar painel, player ou modal', keys: ['Esc'] },
        {
          id: 'todos-keep-search',
          label: 'Categoria «Todos» (mantém o texto da busca)',
          keys: ['Ctrl', '`'],
        },
        { id: 'clear-search', label: 'Limpar barra de busca', keys: ['Shift', 'Esc'] },
        {
          id: 'home',
          label: 'Voltar ao início (Todos, limpar busca e filtros)',
          keys: ['Ctrl', 'Shift', '`'],
        },
      ],
    },
    {
      id: 'player',
      title: 'Player de vídeo',
      items: [
        { id: 'close', label: 'Fechar player', keys: ['Esc'] },
        {
          id: 'nav',
          label: 'Exercício anterior / próximo',
          keys: ['←', '→'],
          when: options.hasLightboxNav,
        },
        { id: 'play', label: 'Play / pausa', keys: ['Espaço'] },
        { id: 'favorite', label: 'Favoritar / desfavoritar', keys: ['F'] },
        { id: 'fullscreen', label: 'Tela cheia do vídeo', keys: ['Shift', 'F'] },
      ],
    },
    {
      id: 'catalog',
      title: 'Catálogo',
      items: [
        {
          id: 'compare',
          label: 'Comparar dois exercícios',
          keys: ['Shift', 'Clique no card'],
          when: options.hasCompare,
        },
        {
          id: 'empty-search-back',
          label: 'Sair da busca sem resultados (categoria anterior)',
          keys: ['Esc'],
        },
      ],
    },
  ];

  if (options.isAdmin) {
    sections.push({
      id: 'admin',
      title: 'Admin',
      items: [{ id: 'admin-close', label: 'Fechar painel de gestão', keys: ['Esc'] }],
    });
  }

  return sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.when !== false),
  }));
}
