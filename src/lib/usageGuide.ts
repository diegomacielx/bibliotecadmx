export interface UsageGuideItem {
  id: string;
  title: string;
  description: string;
  steps?: string[];
}

export interface UsageGuideSection {
  id: string;
  title: string;
  intro?: string;
  items: UsageGuideItem[];
}

export const USAGE_GUIDE_SECTIONS: UsageGuideSection[] = [
  {
    id: 'browse',
    title: 'Explorar a biblioteca',
    intro: 'Encontre exercícios por nome, músculo, categoria ou equipamento.',
    items: [
      {
        id: 'search',
        title: 'Busca',
        description:
          'Use a barra no topo para pesquisar por nome, músculo ou ID. Dentro de uma categoria, a busca filtra só os exercícios daquela aba. Em Configurações (menu da conta), você controla se «Recentes» e «Buscas recentes» são salvos.',
      },
      {
        id: 'categories',
        title: 'Categorias',
        description:
          'As abas abaixo do header filtram por grupo muscular (Peito, Costas, Pernas, etc.). Escolha «Todos» para ver o catálogo completo ou «Favoritos» para os que você marcou.',
      },
      {
        id: 'filters',
        title: 'Filtros avançados',
        description:
          'Abra «Filtros avançados» para refinar por músculos específicos, equipamentos ou «Somente favoritos». Combine filtros com a busca ou com uma categoria. Use «Limpar» para voltar ao estado inicial.',
      },
      {
        id: 'sort',
        title: 'Ordenação da lista',
        description:
          'No menu da conta, abra Configurações e ative «Ordem alfabética (A–Z)» para listar por nome. Desligado, a ordem segue o ID numérico (0001, 0002…).',
      },
      {
        id: 'hero',
        title: 'Destaque inicial',
        description:
          'Na página inicial (categoria «Todos»), o banner superior destaca um exercício em evidência. Clique nele para assistir na hora.',
      },
    ],
  },
  {
    id: 'watch',
    title: 'Assistir exercícios',
    intro: 'Reproduza execuções em alta definição no player cinema.',
    items: [
      {
        id: 'open-player',
        title: 'Abrir um vídeo',
        description:
          'Clique na capa do exercício para abrir o player. No computador, passe o mouse na capa para um preview rápido (desligável em Configurações). No celular, toque na capa e use «Assistir».',
        steps: [],
      },
      {
        id: 'player-controls',
        title: 'Controles do player',
        description:
          'Clique no vídeo ou pressione Espaço para play/pausa. A barra vermelha na base permite avançar ou voltar no tempo. Use ← e → para ir ao exercício anterior ou próximo da lista atual.',
        steps: ['Esc fecha o player.', 'F favorita ou desfavorita o exercício.', 'Shift+F abre tela cheia do vídeo.'],
      },
      {
        id: 'player-actions',
        title: 'Ações no painel lateral',
        description:
          'Baixe a versão 4K, copie o link do YouTube ou favorite o exercício. As informações de músculos trabalhados aparecem ao lado do vídeo.',
      },
      {
        id: 'loop',
        title: 'Repetir em loop',
        description:
          'Em Configurações, ligue «Repetir vídeo em loop» para o vídeo recomeçar sozinho ao terminar. Funciona no player individual e no comparador.',
      },
    ],
  },
  {
    id: 'playlist',
    title: 'Modo treino (playlist)',
    intro: 'Monte uma sequência de exercícios e reproduza na ordem escolhida.',
    items: [
      {
        id: 'start-selection',
        title: 'Montar o treino',
        description:
          'Toque no botão flutuante com ícone de lista (canto inferior da tela) para entrar no modo treino. A barra inferior indica quantos exercícios você selecionou.',
      },
      {
        id: 'pick-order',
        title: 'Escolher a ordem',
        description:
          'Com o modo treino ativo, clique nos cards na ordem desejada. Cada card mostra um número indicando a posição na sequência. Toque novamente para remover da lista.',
      },
      {
        id: 'play-playlist',
        title: 'Iniciar reprodução',
        description:
          'Quando tiver um ou mais exercícios, pressione «Iniciar» na barra inferior. Os vídeos tocam em sequência; ao terminar um, o próximo abre automaticamente (se o loop estiver desligado).',
        steps: ['Use «Limpar» para recomeçar a seleção.', 'Toque no botão flutuante com X para sair do modo treino.'],
      },
    ],
  },
  {
    id: 'compare',
    title: 'Comparar exercícios',
    intro: 'Veja duas execuções lado a lado — ideal para comparar variações.',
    items: [
      {
        id: 'compare-start',
        title: 'Iniciar comparação',
        description:
          'Segure Shift e clique no primeiro exercício (ou use o botão «Comparar» no card). Em seguida, clique no segundo exercício para abrir o modo comparador.',
        steps: ['Disponível no desktop; no celular use as ações do card conforme o layout.'],
      },
      {
        id: 'compare-view',
        title: 'Modo comparador',
        description:
          'Dois vídeos aparecem lado a lado com rótulos «Exercício A» e «Exercício B». O painel à direita traz nome, link e download de cada um. Pressione Esc para fechar.',
      },
      {
        id: 'compare-sync',
        title: 'Sincronizar play/pause',
        description:
          'Use o botão de play ao lado de cada rótulo (ou Espaço) para pausar ou retomar os dois vídeos juntos.',
      },
      {
        id: 'compare-loop',
        title: 'Loop no comparador',
        description:
          'Com «Repetir vídeo em loop» ligado, escolha em Configurações se os vídeos reiniciam juntos («Loop sincronizado») ou cada um só quando o próprio termina.',
      },
    ],
  },
  {
    id: 'header',
    title: 'Header e notificações',
    items: [
      {
        id: 'prefs',
        title: 'Configurações',
        description:
          'No menu da sua conta, abra Configurações para ordenação da lista, recentes, buscas salvas, loop de vídeo e opções do comparador. As escolhas ficam salvas neste navegador.',
      },
      {
        id: 'notifications',
        title: 'Notificações',
        description:
          'O sino avisa sobre novidades na biblioteca. Clique em uma notificação para ir direto ao exercício. Use «Limpar» para arquivar todas.',
      },
      {
        id: 'suggest',
        title: 'Sugerir exercício',
        description:
          'O ícone de lâmpada abre um formulário para pedir a inclusão de um exercício que ainda não está na biblioteca.',
      },
      {
        id: 'shortcuts',
        title: 'Atalhos de teclado',
        description:
          'Pressione ? ou Ctrl+/ (Cmd+/ no Mac) para ver todos os atalhos. Ctrl+K (Cmd+K) foca a busca. Ctrl+` leva à categoria «Todos» mantendo a busca (tecla ao lado do 1); Shift+Esc limpa o texto; Ctrl+Shift+` reseta tudo.',
      },
    ],
  },
  {
    id: 'account',
    title: 'Sua conta',
    items: [
      {
        id: 'nickname',
        title: 'Apelido',
        description:
          'Defina como quer ser identificado no menu da conta. O apelido aparece no header e pode ser alterado a qualquer momento.',
      },
      {
        id: 'theme',
        title: 'Tema claro ou escuro',
        description: 'Escolha «Escuro» ou «Claro» em Aparência. A preferência é lembrada neste navegador.',
      },
      {
        id: 'favorites',
        title: 'Favoritos',
        description:
          'Favorite exercícios no player (F) ou pelos ícones nos cards. Acesse todos na categoria «Favoritos».',
      },
      {
        id: 'logout',
        title: 'Encerrar sessão',
        description: 'Use «Encerrar sessão» no menu da conta para sair com segurança neste dispositivo.',
      },
    ],
  },
];
