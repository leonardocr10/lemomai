/**
 * Seed inicial: popula o MySQL a partir dos mesmos arquivos de mock usados
 * pelo site em USE_MOCK_DATA=true. Assim os dois modos exibem o mesmo conteúdo.
 */
const services = require('../../src/data/mock/services.mock');
const plans = require('../../src/data/mock/plans.mock');
const portfolio = require('../../src/data/mock/portfolio.mock');
const testimonials = require('../../src/data/mock/testimonials.mock');
const faq = require('../../src/data/mock/faq.mock');
const company = require('../../src/data/mock/company.mock');
const sections = require('../../src/data/mock/sections.mock');

const snake = (key) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

/** Converte chaves para snake_case e serializa arrays/objetos (colunas JSON). */
function toRow(item, omit = []) {
  const row = {};
  for (const [key, value] of Object.entries(item)) {
    if (omit.includes(key)) continue;
    row[snake(key)] = value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
  }
  return row;
}

const TABLES = ['plan_features', 'plans', 'services', 'portfolio_projects', 'testimonials', 'faq', 'company_settings', 'site_sections'];

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('services', services.map((item) => toRow(item)));
    await queryInterface.bulkInsert('plans', plans.map((item) => toRow(item, ['features'])));
    await queryInterface.bulkInsert(
      'plan_features',
      plans.flatMap((plan) =>
        plan.features.map((feature, index) => ({ plan_id: plan.id, feature, display_order: index + 1 })),
      ),
    );
    await queryInterface.bulkInsert('portfolio_projects', portfolio.map((item) => toRow(item)));
    await queryInterface.bulkInsert('testimonials', testimonials.map((item) => toRow(item)));
    await queryInterface.bulkInsert('faq', faq.map((item) => toRow(item)));
    await queryInterface.bulkInsert('company_settings', [toRow(company)]);
    await queryInterface.bulkInsert(
      'site_sections',
      Object.entries(sections).map(([key, content]) => ({ key, content: JSON.stringify(content), active: true })),
    );
  },

  async down(queryInterface) {
    for (const table of TABLES) {
      await queryInterface.bulkDelete(table, null, {});
    }
  },
};
