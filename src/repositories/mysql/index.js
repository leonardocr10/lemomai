/**
 * Repositórios MySQL (Sequelize). Retornam objetos simples no mesmo formato
 * dos mocks, para que services e views não percebam a troca.
 * Todas as consultas usam o ORM (prepared statements), nunca SQL concatenado.
 */
const { getModels } = require('../../models');

const ORDER = [['displayOrder', 'ASC'], ['id', 'ASC']];
const plain = (row) => (row ? row.get({ plain: true }) : null);

function collection(modelName, { include, map = (item) => item } = {}) {
  const model = () => getModels()[modelName];
  const options = () => (include ? { include: include(getModels()) } : {});
  return {
    async findAll(filters = {}) {
      const where = { active: true };
      for (const [key, value] of Object.entries(filters)) if (value !== undefined) where[key] = value;
      const rows = await model().findAll({ where, order: ORDER, ...options() });
      return rows.map((row) => map(plain(row)));
    },
    async findBySlug(slug) {
      const row = await model().findOne({ where: { slug, active: true }, ...options() });
      return row ? map(plain(row)) : null;
    },
  };
}

const mapPlan = (plan) => ({
  ...plan,
  price: plan.price === null ? null : Number(plan.price),
  features: (plan.features || [])
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((feature) => feature.feature),
});

module.exports = {
  services: collection('Service'),
  plans: collection('Plan', {
    include: ({ PlanFeature }) => [{ model: PlanFeature, as: 'features' }],
    map: mapPlan,
  }),
  portfolio: collection('PortfolioProject'),
  testimonials: collection('Testimonial'),
  faq: collection('Faq'),

  company: {
    async get() {
      const row = await getModels().CompanySetting.findOne({ order: [['id', 'ASC']] });
      return plain(row) || {};
    },
  },

  sections: {
    async getAll() {
      const rows = await getModels().SiteSection.findAll({ where: { active: true } });
      return Object.fromEntries(rows.map((row) => [row.key, row.content]));
    },
  },

  leads: {
    async create(data) {
      return plain(await getModels().Lead.create(data));
    },
    async findAll() {
      const rows = await getModels().Lead.findAll({ order: [['createdAt', 'DESC']] });
      return rows.map(plain);
    },
  },
};
