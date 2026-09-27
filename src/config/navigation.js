/**
 * Menus do site. Header e footer são renderizados a partir destas listas,
 * nenhum link de navegação fica fixo nas views.
 */
const mainNav = [
  { label: 'Início', href: '/', match: /^\/$/ },
  { label: 'Serviços', href: '/servicos', match: /^\/servicos/ },
  { label: 'Soluções', href: '/planos', match: /^\/planos/ },
  { label: 'Preços', href: '/#precos' },
  { label: 'Portfólio', href: '/portfolio', match: /^\/portfolio/ },
  { label: 'Sobre', href: '/sobre', match: /^\/sobre/ },
  { label: 'Contato', href: '/contato', match: /^\/contato/ },
];

const footerNav = [
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre', href: '/sobre' },
      { label: 'Portfólio', href: '/portfolio' },
      { label: 'Contato', href: '/contato' },
      { label: 'Solicitar orçamento', href: '/orcamento' },
    ],
  },
  {
    title: 'Serviços',
    links: [
      { label: 'Sites', href: '/servicos/criacao-de-sites' },
      { label: 'Sistemas', href: '/servicos/sistemas-sob-medida' },
      { label: 'Landing Pages', href: '/servicos/landing-pages' },
      { label: 'SaaS', href: '/planos' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
      { label: 'Termos de Uso', href: '/termos-de-uso' },
      { label: 'Cookies', href: '/politica-de-cookies' },
    ],
  },
];

module.exports = { mainNav, footerNav };
