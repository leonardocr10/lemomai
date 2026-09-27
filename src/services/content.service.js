/**
 * Conteúdo público do site. Controllers e API usam apenas este service,
 * que por sua vez fala com os repositórios (mock ou MySQL).
 */
const repositories = require('../repositories');
const { remember } = require('../utils/cache');

const SECTIONS_TTL = 60 * 1000;

const contentService = {
  listServices: () => repositories.services.findAll(),
  getService: (slug) => repositories.services.findBySlug(slug),

  listPlans: (category) => repositories.plans.findAll({ category }),
  listProjectPlans: () => repositories.plans.findAll({ category: 'project' }),
  listSaasPlans: () => repositories.plans.findAll({ category: 'saas' }),
  getPlan: (slug) => repositories.plans.findBySlug(slug),

  listPortfolio: () => repositories.portfolio.findAll(),
  getPortfolioProject: (slug) => repositories.portfolio.findBySlug(slug),

  listTestimonials: () => repositories.testimonials.findAll(),
  listFaq: () => repositories.faq.findAll(),

  getSections: () => remember('sections', SECTIONS_TTL, () => repositories.sections.getAll()),

  /** Tudo que a home precisa, carregado em paralelo. */
  async getHomeContent() {
    const [sections, services, plans, portfolio, testimonials, faq] = await Promise.all([
      contentService.getSections(),
      contentService.listServices(),
      contentService.listProjectPlans(),
      contentService.listPortfolio(),
      contentService.listTestimonials(),
      contentService.listFaq(),
    ]);
    return { sections, services, plans, portfolio, testimonials, faq };
  },

  /** Projetos relacionados para a página de detalhe do portfólio. */
  async getRelatedProjects(slug, limit = 3) {
    const projects = await contentService.listPortfolio();
    return projects.filter((project) => project.slug !== slug).slice(0, limit);
  },
};

module.exports = contentService;
