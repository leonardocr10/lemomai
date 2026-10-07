/**
 * Banners do carrossel da home (imagens 2000×667, proporção 3:1, com título e
 * botão desenhados). O `alt` repete o texto da imagem para leitores de tela e buscadores.
 */
module.exports = [
  {
    id: 1,
    title: 'Websites e sistemas para o crescimento',
    alt: 'Websites e sistemas para o crescimento do seu negócio. Soluções digitais sob medida para atrair mais clientes, aumentar suas vendas e automatizar sua operação. Quero meu projeto.',
    href: '/orcamento',
    image: '/images/banners/sites-crescimento.webp',
    mobileImage: null,
    fullWidth: false,
    active: true,
    displayOrder: 1,
  },
  {
    id: 2,
    title: 'Projetos digitais que geram crescimento',
    alt: 'Projetos digitais que geram crescimento. Sites e sistemas estratégicos para atrair mais clientes, aumentar suas conversões e levar o seu negócio mais longe. Solicitar orçamento.',
    href: '/orcamento',
    image: '/images/banners/projetos-geram-crescimento.webp',
    mobileImage: null,
    fullWidth: false,
    active: true,
    displayOrder: 2,
  },
  {
    id: 3,
    title: 'Automação: mais produtividade',
    alt: 'Automação inteligente para o seu negócio. Mais produtividade, menos trabalho manual: automatize processos, conecte WhatsApp, Gmail, Google Sheets, Notion, Slack, calendário e CRM. Comece a automatizar agora.',
    href: '/contato',
    image: '/images/banners/automacao-produtividade.webp',
    mobileImage: null,
    fullWidth: false,
    active: true,
    displayOrder: 3,
  },
];
