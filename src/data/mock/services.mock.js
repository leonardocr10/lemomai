/**
 * Serviços oferecidos (futura tabela services).
 * `icon` referencia um símbolo de public/icons/sprite.svg.
 */
module.exports = [
  {
    id: 1,
    name: 'Criação de Sites',
    slug: 'criacao-de-sites',
    shortDescription: 'Sites modernos, responsivos e otimizados para o Google.',
    description:
      'Desenvolvemos sites institucionais que apresentam sua empresa com clareza e credibilidade. Cada projeto nasce de um layout exclusivo, é otimizado para velocidade e SEO e funciona perfeitamente em computadores, tablets e celulares.',
    icon: 'monitor',
    features: [
      'Layout exclusivo alinhado à sua marca',
      'Estrutura otimizada para SEO e Google',
      'Carregamento rápido e boas notas no Core Web Vitals',
      'Painel para editar conteúdos',
      'Formulários, WhatsApp e integrações',
      'Hospedagem e certificado SSL orientados',
    ],
    active: true,
    displayOrder: 1,
  },
  {
    id: 2,
    name: 'Sistemas sob medida',
    slug: 'sistemas-sob-medida',
    shortDescription: 'Soluções personalizadas para os processos da sua empresa.',
    description:
      'Mapeamos a operação da sua empresa e desenvolvemos sistemas web que automatizam rotinas, centralizam informações e dão visibilidade para a gestão — sem forçar seu negócio a caber em um software genérico.',
    icon: 'code',
    features: [
      'Levantamento e análise de requisitos',
      'Painel administrativo com controle de acesso',
      'Relatórios e dashboards gerenciais',
      'Integrações com APIs, ERPs e meios de pagamento',
      'Banco de dados estruturado e seguro',
      'Implantação, treinamento e suporte',
    ],
    active: true,
    displayOrder: 2,
  },
  {
    id: 3,
    name: 'Landing Pages',
    slug: 'landing-pages',
    shortDescription: 'Páginas focadas em conversão e resultados.',
    description:
      'Landing pages pensadas para campanhas, lançamentos e captação de leads. Copy objetiva, hierarquia visual clara e chamadas para ação estratégicas para transformar visitantes em clientes.',
    icon: 'rocket',
    features: [
      'Estrutura orientada à conversão',
      'Integração com WhatsApp, CRM e e-mail marketing',
      'Pixels e eventos de conversão configurados',
      'Carregamento ultrarrápido',
      'Testes A/B quando necessário',
      'Totalmente responsiva',
    ],
    active: true,
    displayOrder: 3,
  },
  {
    id: 4,
    name: 'Suporte e manutenção',
    slug: 'suporte-e-manutencao',
    shortDescription: 'Seu projeto sempre no ar, com suporte especializado.',
    description:
      'Acompanhamento técnico contínuo para sites e sistemas: atualizações, backups, monitoramento, correções e pequenas evoluções, com atendimento próximo e prazos combinados.',
    icon: 'headset',
    features: [
      'Monitoramento de disponibilidade',
      'Backups periódicos',
      'Atualizações de segurança',
      'Correções e pequenos ajustes',
      'Relatórios de atendimento',
      'Canal direto com a equipe técnica',
    ],
    active: true,
    displayOrder: 4,
  },
  {
    id: 5,
    name: 'E-commerce',
    slug: 'e-commerce',
    shortDescription: 'Lojas virtuais completas, com catálogo, pagamentos e gestão.',
    description:
      'Lojas virtuais completas para vender online com segurança: catálogo, carrinho, meios de pagamento, cálculo de frete, gestão de pedidos e integração com estoque e emissão fiscal.',
    icon: 'cart',
    features: [
      'Catálogo com variações e categorias',
      'Pagamentos via Pix, cartão e boleto',
      'Cálculo de frete e rastreamento',
      'Gestão de pedidos e estoque',
      'Cupons e ações de marketing',
      'Integração com emissão fiscal',
    ],
    active: true,
    displayOrder: 5,
  },
  {
    id: 6,
    name: 'Automação',
    slug: 'automacao',
    shortDescription: 'Automatize processos e reduza tarefas manuais.',
    description:
      'Conectamos sistemas, planilhas e plataformas para eliminar retrabalho: integrações via API, rotinas agendadas, notificações automáticas e fluxos que economizam horas da sua equipe.',
    icon: 'zap',
    features: [
      'Integração entre sistemas via API',
      'Rotinas e relatórios automáticos',
      'Notificações por e-mail e WhatsApp',
      'Importação e tratamento de dados',
      'Redução de erros operacionais',
      'Monitoramento dos fluxos',
    ],
    active: true,
    displayOrder: 6,
  },
];
