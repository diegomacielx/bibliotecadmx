import type { UsageGuideSection } from './usageGuide';

export const MOBILE_USAGE_GUIDE_SECTIONS: UsageGuideSection[] = [
  {
    id: 'nav',
    title: 'Navegação',
    intro: 'Use a barra inferior para alternar entre as áreas principais do app.',
    items: [
      {
        id: 'tabs',
        title: 'Barra inferior',
        description:
          'Início: catálogo e categorias. Montar treino: monte e reproduza sua sequência. Favoritos: exercícios salvos. Perfil: conta, tema e configurações.',
      },
      {
        id: 'search',
        title: 'Busca',
        description:
          'Toque na lupa no topo para pesquisar por nome, músculo ou ID. Pressione Enter ou confirme no teclado para ver todos os resultados.',
      },
    ],
  },
  {
    id: 'browse',
    title: 'Explorar exercícios',
    items: [
      {
        id: 'categories',
        title: 'Categorias',
        description:
          'Na aba Início, deslize as pílulas de categoria (Peito, Costas, Pernas…) para filtrar. Toque em «Todos» para ver o catálogo completo.',
      },
      {
        id: 'filters',
        title: 'Filtros',
        description:
          'Toque em «Filtros» para refinar por músculos, equipamentos ou «Somente favoritos». Use «Limpar» para resetar.',
      },
      {
        id: 'view',
        title: 'Grade ou lista',
        description:
          'Alterne entre visualização em grade (capas grandes) ou lista compacta pelo ícone ao lado de Filtros.',
      },
      {
        id: 'hero',
        title: 'Destaque',
        description:
          'Na home (categoria «Todos»), o banner superior destaca um exercício em evidência. Toque para assistir.',
      },
    ],
  },
  {
    id: 'watch',
    title: 'Assistir vídeos',
    intro: 'Toque na capa de um exercício para abrir o player em tela cheia.',
    items: [
      {
        id: 'player',
        title: 'Player mobile',
        description:
          'O vídeo abre em tela cheia estilo Reels. Deslize para cima ou para baixo para ir ao exercício anterior ou próximo da lista atual.',
      },
      {
        id: 'player-actions',
        title: 'Ações rápidas',
        description:
          'Favorite, copie o link do YouTube ou baixe a versão em alta qualidade pelos botões sobre o vídeo. Toque fora ou use o botão fechar para voltar ao catálogo.',
      },
      {
        id: 'loop',
        title: 'Repetir em loop',
        description:
          'Em Perfil → Configurações, ative «Repetir vídeo em loop» para o vídeo recomeçar automaticamente ao terminar.',
      },
    ],
  },
  {
    id: 'workout',
    title: 'Montar treino',
    intro: 'Monte uma sequência personalizada e reproduza na ordem escolhida.',
    items: [
      {
        id: 'select',
        title: 'Selecionar exercícios',
        description:
          'Vá à aba «Montar treino» e toque em «Adicionar exercícios». Toque nos cards na ordem desejada — cada um recebe um número. Toque novamente para remover.',
      },
      {
        id: 'play',
        title: 'Iniciar treino',
        description:
          'Com um ou mais exercícios selecionados, toque em «Iniciar treino». Os vídeos tocam em sequência; ao terminar um, o próximo abre automaticamente.',
        steps: ['Use «Limpar» para recomeçar a seleção.'],
      },
    ],
  },
  {
    id: 'favorites',
    title: 'Favoritos',
    items: [
      {
        id: 'save',
        title: 'Salvar exercícios',
        description:
          'Toque no ícone de coração nos cards ou no player para favoritar. Acesse todos na aba «Favoritos».',
      },
    ],
  },
  {
    id: 'account',
    title: 'Perfil e conta',
    items: [
      {
        id: 'nickname',
        title: 'Apelido',
        description: 'Defina como quer ser identificado na aba Perfil. Toque em «Salvar» após editar.',
      },
      {
        id: 'theme',
        title: 'Tema claro ou escuro',
        description: 'Escolha «Claro» ou «Escuro» em Aparência. A preferência fica salva neste dispositivo.',
      },
      {
        id: 'settings',
        title: 'Configurações',
        description:
          'Em Perfil → Configurações você controla loop de vídeo, recentes salvos e buscas recentes.',
      },
      {
        id: 'suggest',
        title: 'Sugerir exercício',
        description:
          'Use «Sugerir exercício» no Perfil para pedir a inclusão de um movimento que ainda não está na biblioteca.',
      },
      {
        id: 'logout',
        title: 'Sair',
        description: 'Toque em «Sair» no Perfil para encerrar a sessão neste dispositivo.',
      },
    ],
  },
];
