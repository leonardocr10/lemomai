/**
 * Repositórios em memória baseados em src/data/mock.
 * Expõem exatamente a mesma interface dos repositórios MySQL.
 */
const fs = require('node:fs/promises');
const path = require('node:path');

const servicesData = require('../../data/mock/services.mock');
const plansData = require('../../data/mock/plans.mock');
const portfolioData = require('../../data/mock/portfolio.mock');
const testimonialsData = require('../../data/mock/testimonials.mock');
const faqData = require('../../data/mock/faq.mock');
const companyData = require('../../data/mock/company.mock');
const sectionsData = require('../../data/mock/sections.mock');

const byOrder = (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
const clone = (value) => structuredClone(value);

/** Coleções somente leitura: nenhuma chamada consegue alterar o mock original. */
function collection(items) {
  const active = () => items.filter((item) => item.active !== false).sort(byOrder);
  return {
    async findAll(filters = {}) {
      return clone(
        active().filter((item) =>
          Object.entries(filters).every(([key, value]) => value === undefined || item[key] === value),
        ),
      );
    },
    async findBySlug(slug) {
      const item = active().find((entry) => entry.slug === slug);
      return item ? clone(item) : null;
    },
  };
}

/**
 * Leads em modo mock ficam em memória e são gravados em storage/leads.json,
 * permitindo conferir os envios durante o desenvolvimento.
 */
const LEADS_FILE = path.resolve(__dirname, '../../../storage/leads.json');
const leads = [];
let leadsLoaded = false;

async function loadLeads() {
  if (leadsLoaded) return;
  try {
    leads.push(...JSON.parse(await fs.readFile(LEADS_FILE, 'utf8')));
  } catch {
    // Arquivo ainda não existe.
  }
  leadsLoaded = true;
}

const leadsRepository = {
  async create(data) {
    await loadLeads();
    const now = new Date().toISOString();
    const lead = { id: leads.length + 1, status: 'new', ...data, createdAt: now, updatedAt: now };
    leads.push(lead);
    await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
    return clone(lead);
  },
  async findAll() {
    await loadLeads();
    return clone([...leads].reverse());
  },
};

module.exports = {
  services: collection(servicesData),
  plans: collection(plansData),
  portfolio: collection(portfolioData),
  testimonials: collection(testimonialsData),
  faq: collection(faqData),
  company: {
    async get() {
      return clone(companyData);
    },
  },
  sections: {
    async getAll() {
      return clone(sectionsData);
    },
  },
  leads: leadsRepository,
};
