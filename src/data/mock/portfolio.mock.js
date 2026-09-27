/**
 * Projetos do portfólio (futura tabela portfolio_projects).
 * Não expor dados privados de clientes: apenas escopo, desafio e solução.
 */
module.exports = [
  {
    id: 1,
    name: 'Cassiano3D',
    slug: 'cassiano3d',
    category: 'E-commerce + ERP',
    segment: 'Impressão 3D e produtos personalizados',
    description:
      'Sistema completo com e-commerce, produtos, estoque, compras, fiscal, financeiro, marketing e administração.',
    challenge:
      'A operação dependia de ferramentas separadas para vender online, controlar estoque, registrar compras e emitir notas, o que gerava retrabalho e pouca visibilidade dos números do negócio.',
    solution:
      'Desenvolvemos uma plataforma única que integra a loja virtual à gestão interna: catálogo de produtos 3D, controle de estoque e compras, módulo fiscal, financeiro, ferramentas de marketing e um painel administrativo centralizado.',
    technologies: ['Node.js', 'Express', 'MySQL', 'JavaScript', 'API de pagamentos', 'Emissão fiscal'],
    coverImage: '/images/portfolio/cassiano3d-cover.svg',
    screenshots: [
      { src: '/images/portfolio/cassiano3d-cover.svg', alt: 'Visão da loja virtual com catálogo de produtos 3D' },
      { src: '/images/portfolio/cassiano3d-admin.svg', alt: 'Painel administrativo com indicadores de vendas e estoque' },
    ],
    results: [
      'Vendas, estoque, compras e fiscal centralizados em um único sistema',
      'Menos retrabalho no cadastro e na conferência de pedidos',
      'Indicadores de gestão disponíveis em tempo real no painel',
    ],
    active: true,
    displayOrder: 1,
  },
  {
    id: 2,
    name: 'Sistema administrativo',
    slug: 'sistema-administrativo',
    category: 'Sistema sob medida',
    segment: 'Gestão empresarial',
    description:
      'Painel web para controle de clientes, projetos, financeiro e relatórios, com perfis de acesso por equipe.',
    challenge:
      'Planilhas espalhadas e informações desencontradas dificultavam acompanhar clientes, prazos e o fluxo financeiro.',
    solution:
      'Sistema administrativo sob medida com cadastro de clientes, gestão de projetos, controle financeiro, relatórios e dashboards com indicadores do negócio.',
    technologies: ['Node.js', 'Express', 'MySQL', 'Chart.js', 'API REST'],
    coverImage: '/images/portfolio/sistema-administrativo-cover.svg',
    screenshots: [
      { src: '/images/portfolio/sistema-administrativo-cover.svg', alt: 'Dashboard com indicadores de receita, clientes e projetos' },
      { src: '/images/portfolio/sistema-administrativo-list.svg', alt: 'Listagem de projetos com status' },
    ],
    results: [
      'Informações centralizadas e acessíveis por toda a equipe',
      'Relatórios gerados em segundos',
      'Controle de acesso por perfil de usuário',
    ],
    active: true,
    displayOrder: 2,
  },
  {
    id: 3,
    name: 'Site institucional',
    slug: 'site-institucional',
    category: 'Website',
    segment: 'Serviços profissionais',
    description:
      'Site institucional responsivo, com páginas de serviços, blog, formulários e integração com WhatsApp.',
    challenge:
      'A empresa precisava de uma presença digital profissional que transmitisse credibilidade e gerasse contatos qualificados.',
    solution:
      'Site com layout exclusivo, conteúdo organizado por serviços, SEO on-page, formulários de contato e painel para atualização de conteúdo.',
    technologies: ['Node.js', 'EJS', 'CSS moderno', 'SEO técnico', 'Google Analytics'],
    coverImage: '/images/portfolio/site-institucional-cover.svg',
    screenshots: [
      { src: '/images/portfolio/site-institucional-cover.svg', alt: 'Página inicial do site institucional' },
    ],
    results: [
      'Presença digital alinhada à identidade da marca',
      'Contatos recebidos diretamente pelo site e WhatsApp',
      'Estrutura preparada para ranquear no Google',
    ],
    active: true,
    displayOrder: 3,
  },
  {
    id: 4,
    name: 'Landing Page',
    slug: 'landing-page',
    category: 'Conversão',
    segment: 'Campanhas de marketing',
    description:
      'Landing page de alta conversão para campanha de captação, integrada a formulário, WhatsApp e pixels de anúncio.',
    challenge:
      'A campanha precisava de uma página rápida, objetiva e mensurável para transformar tráfego pago em leads.',
    solution:
      'Página única com hierarquia de conteúdo focada em conversão, formulário otimizado, eventos de conversão configurados e carregamento ultrarrápido.',
    technologies: ['HTML5', 'CSS', 'JavaScript', 'Meta Pixel', 'Google Tag Manager'],
    coverImage: '/images/portfolio/landing-page-cover.svg',
    screenshots: [
      { src: '/images/portfolio/landing-page-cover.svg', alt: 'Landing page com chamada principal e formulário' },
    ],
    results: [
      'Página leve e com carregamento rápido em dispositivos móveis',
      'Conversões rastreadas por evento',
      'Integração direta com o WhatsApp comercial',
    ],
    active: true,
    displayOrder: 4,
  },
];
