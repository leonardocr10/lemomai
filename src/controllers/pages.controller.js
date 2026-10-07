/**
 * Páginas institucionais. Controllers apenas orquestram: pedem dados aos
 * services e escolhem a view. Nenhuma regra de dados fica aqui.
 */
const contentService = require('../services/content.service');
const seo = require('../utils/seo');
const HttpError = require('../utils/http-error');
const forms = require('../config/forms');

async function home(req, res) {
  const content = await contentService.getHomeContent();
  const { company } = res.locals;
  res.renderPage('home', {
    ...content,
    preloadHero: true,
    contactProjectTypes: forms.contactProjectTypes,
    budgetRanges: forms.budgetRanges,
    seo: seo.buildSeo({
      title: 'Sistemas, sites e soluções digitais',
      description:
        'A Lenom.AI cria sites profissionais, sistemas sob medida, landing pages e soluções SaaS que impulsionam o crescimento da sua empresa.',
      path: '/',
      companyName: company.companyName,
      brandFirst: true,
    }),
    schemas: [
      seo.serviceListSchema(content.services, company),
      seo.offerCatalogSchema(content.plans, company),
      seo.faqSchema(content.faq),
    ],
  });
}

async function services(req, res) {
  const [services, sections] = await Promise.all([contentService.listServices(), contentService.getSections()]);
  const { company } = res.locals;
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Serviços', href: '/servicos' },
  ];
  res.renderPage('services/index', {
    services,
    sections,
    breadcrumbs,
    seo: seo.buildSeo({
      title: 'Serviços',
      description:
        'Criação de sites, sistemas sob medida, landing pages, e-commerce, automação, suporte e manutenção. Conheça as soluções da Lenom.AI.',
      path: '/servicos',
      companyName: company.companyName,
    }),
    schemas: [seo.serviceListSchema(services, company), seo.breadcrumbSchema(breadcrumbs)],
  });
}

async function serviceDetail(req, res) {
  const service = await contentService.getService(req.params.slug);
  if (!service) throw HttpError.notFound('Serviço não encontrado');
  const [services, sections] = await Promise.all([contentService.listServices(), contentService.getSections()]);
  const { company } = res.locals;
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Serviços', href: '/servicos' },
    { label: service.name, href: `/servicos/${service.slug}` },
  ];
  res.renderPage('services/show', {
    service,
    otherServices: services.filter((item) => item.slug !== service.slug).slice(0, 3),
    sections,
    breadcrumbs,
    seo: seo.buildSeo({
      title: service.name,
      description: service.shortDescription,
      path: `/servicos/${service.slug}`,
      companyName: company.companyName,
    }),
    schemas: [seo.serviceSchema(service, company), seo.breadcrumbSchema(breadcrumbs)],
  });
}

async function plans(req, res) {
  const [saasPlans, projectPlans, faq, sections] = await Promise.all([
    contentService.listSaasPlans(),
    contentService.listProjectPlans(),
    contentService.listFaq(),
    contentService.getSections(),
  ]);
  const { company } = res.locals;
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Planos', href: '/planos' },
  ];
  res.renderPage('plans', {
    saasPlans,
    projectPlans,
    faq,
    sections,
    breadcrumbs,
    seo: seo.buildSeo({
      title: 'Planos SaaS e soluções',
      description:
        'Planos SaaS da Lenom.AI a partir de R$ 199/mês: sistema em nuvem, atualizações, backup e suporte técnico. Compare e escolha o ideal.',
      path: '/planos',
      companyName: company.companyName,
    }),
    schemas: [seo.offerCatalogSchema(saasPlans, company), seo.breadcrumbSchema(breadcrumbs)],
  });
}

async function portfolio(req, res) {
  const [projects, sections] = await Promise.all([contentService.listPortfolio(), contentService.getSections()]);
  const { company } = res.locals;
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Portfólio', href: '/portfolio' },
  ];
  res.renderPage('portfolio/index', {
    projects,
    sections,
    breadcrumbs,
    seo: seo.buildSeo({
      title: 'Portfólio',
      description: 'Conheça projetos desenvolvidos pela Lenom.AI: e-commerce, ERPs, sistemas administrativos, sites e landing pages.',
      path: '/portfolio',
      companyName: company.companyName,
    }),
    schemas: [seo.breadcrumbSchema(breadcrumbs)],
  });
}

async function portfolioDetail(req, res) {
  const project = await contentService.getPortfolioProject(req.params.slug);
  if (!project) throw HttpError.notFound('Projeto não encontrado');
  const related = await contentService.getRelatedProjects(project.slug);
  const { company } = res.locals;
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Portfólio', href: '/portfolio' },
    { label: project.name, href: `/portfolio/${project.slug}` },
  ];
  res.renderPage('portfolio/show', {
    project,
    related,
    breadcrumbs,
    seo: seo.buildSeo({
      title: `${project.name} — ${project.category}`,
      description: project.description,
      path: `/portfolio/${project.slug}`,
      type: 'article',
      companyName: company.companyName,
    }),
    schemas: [
      {
        '@context': 'https://schema.org',
        '@type': 'CreativeWork',
        name: project.name,
        description: project.description,
        genre: project.category,
        creator: { '@id': `${seo.absoluteUrl('/')}#organization` },
        keywords: (project.technologies || []).join(', '),
      },
      seo.breadcrumbSchema(breadcrumbs),
    ],
  });
}

async function about(req, res) {
  const [sections, services] = await Promise.all([contentService.getSections(), contentService.listServices()]);
  const { company } = res.locals;
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Sobre', href: '/sobre' },
  ];
  res.renderPage('about', {
    about: sections.about,
    sections,
    services,
    breadcrumbs,
    seo: seo.buildSeo({
      title: 'Sobre',
      description:
        'A Lenom.AI desenvolve sites, sistemas e soluções digitais sob medida para empresas que desejam modernizar processos e crescer com tecnologia.',
      path: '/sobre',
      companyName: company.companyName,
    }),
    schemas: [seo.breadcrumbSchema(breadcrumbs)],
  });
}

const legalPages = {
  privacy: {
    view: 'legal/privacy',
    path: '/politica-de-privacidade',
    title: 'Política de Privacidade',
    description: 'Saiba como a Lenom.AI coleta, utiliza e protege seus dados pessoais, em conformidade com a LGPD.',
  },
  terms: {
    view: 'legal/terms',
    path: '/termos-de-uso',
    title: 'Termos de Uso',
    description: 'Termos e condições de uso do site da Lenom.AI.',
  },
  cookies: {
    view: 'legal/cookies',
    path: '/politica-de-cookies',
    title: 'Política de Cookies',
    description: 'Entenda quais cookies o site da Lenom.AI utiliza e como gerenciar suas preferências.',
  },
};

const legal = (key) =>
  async function legalPage(req, res) {
    const page = legalPages[key];
    res.renderPage(page.view, {
      page,
      updatedAt: '26 de setembro de 2026',
      breadcrumbs: [
        { label: 'Início', href: '/' },
        { label: page.title, href: page.path },
      ],
      seo: seo.buildSeo({ title: page.title, description: page.description, path: page.path, companyName: res.locals.company.companyName }),
    });
  };

module.exports = {
  home,
  services,
  serviceDetail,
  plans,
  portfolio,
  portfolioDetail,
  about,
  privacy: legal('privacy'),
  terms: legal('terms'),
  cookies: legal('cookies'),
};
