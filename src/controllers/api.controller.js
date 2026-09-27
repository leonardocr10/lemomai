/**
 * API JSON pública. Mesmo formato de dados em modo mock e MySQL, pronta
 * para ser consumida por um futuro front-end em React/Vue/Angular.
 */
const contentService = require('../services/content.service');
const leadService = require('../services/lead.service');
const { discardUpload } = require('../middlewares/upload');

const ok = (res, data) => res.json({ ok: true, data });
const meta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

module.exports = {
  csrfToken: (req, res) => ok(res, { csrfToken: req.csrfToken }),

  services: async (req, res) => ok(res, await contentService.listServices()),
  service: async (req, res) => {
    const service = await contentService.getService(req.params.slug);
    if (!service) return res.status(404).json({ ok: false, message: 'Serviço não encontrado' });
    return ok(res, service);
  },

  plans: async (req, res) => {
    const category = ['project', 'saas'].includes(req.query.category) ? req.query.category : undefined;
    ok(res, await contentService.listPlans(category));
  },

  portfolio: async (req, res) => ok(res, await contentService.listPortfolio()),
  portfolioProject: async (req, res) => {
    const project = await contentService.getPortfolioProject(req.params.slug);
    if (!project) return res.status(404).json({ ok: false, message: 'Projeto não encontrado' });
    return ok(res, project);
  },

  testimonials: async (req, res) => ok(res, await contentService.listTestimonials()),
  faq: async (req, res) => ok(res, await contentService.listFaq()),

  async contact(req, res) {
    try {
      const lead = await leadService.createFromContact(req.body, meta(req));
      res.status(201).json({ ok: true, message: 'Mensagem enviada! Retornaremos em breve.', data: { id: lead.id } });
    } catch (err) {
      if (err instanceof leadService.ValidationError) {
        return res.status(422).json({ ok: false, message: 'Verifique os campos destacados.', errors: err.errors });
      }
      throw err;
    }
  },

  async quote(req, res) {
    if (req.uploadError) {
      discardUpload(req.file);
      return res.status(422).json({ ok: false, message: req.uploadError, errors: { attachment: req.uploadError } });
    }
    try {
      const lead = await leadService.createFromQuote(req.body, req.file, meta(req));
      return res
        .status(201)
        .json({ ok: true, message: 'Solicitação enviada! Em breve você receberá nossa proposta.', data: { id: lead.id } });
    } catch (err) {
      discardUpload(req.file);
      if (err instanceof leadService.ValidationError) {
        return res.status(422).json({ ok: false, message: 'Verifique os campos destacados.', errors: err.errors });
      }
      throw err;
    }
  },
};
