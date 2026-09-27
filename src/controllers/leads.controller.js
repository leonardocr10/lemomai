/**
 * Formulários server-rendered de contato e orçamento.
 * Funcionam sem JavaScript; com JS, o front envia para a API (/api/contact,
 * /api/quote) e exibe um toast, mas as regras são as mesmas (lead.service).
 */
const forms = require('../config/forms');
const contentService = require('../services/content.service');
const leadService = require('../services/lead.service');
const { discardUpload } = require('../middlewares/upload');
const seo = require('../utils/seo');

const formOptions = {
  contactProjectTypes: forms.contactProjectTypes,
  quoteProjectTypes: forms.quoteProjectTypes,
  budgetRanges: forms.budgetRanges,
  deadlines: forms.deadlines,
  attachmentAccept: forms.attachment.accept,
};

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') });

async function renderContact(req, res, { values = {}, errors = {}, success = false, status = 200 } = {}) {
  const sections = await contentService.getSections();
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Contato', href: '/contato' },
  ];
  res.status(status).renderPage('contact', {
    ...formOptions,
    sections,
    values,
    errors,
    success,
    breadcrumbs,
    seo: seo.buildSeo({
      title: 'Contato',
      description: 'Fale com a LC Serviços pelo formulário, WhatsApp ou e-mail. Retornamos em até 1 dia útil.',
      path: '/contato',
      companyName: res.locals.company.companyName,
    }),
    schemas: [seo.breadcrumbSchema(breadcrumbs)],
  });
}

async function renderQuote(req, res, { values = {}, errors = {}, success = false, status = 200 } = {}) {
  const plans = await contentService.listPlans();
  const breadcrumbs = [
    { label: 'Início', href: '/' },
    { label: 'Orçamento', href: '/orcamento' },
  ];
  res.status(status).renderPage('quote', {
    ...formOptions,
    plans,
    values,
    errors,
    success,
    breadcrumbs,
    maxUploadMb: Math.round(require('../config').limits.uploadMaxBytes / 1024 / 1024),
    seo: seo.buildSeo({
      title: 'Solicitar orçamento',
      description:
        'Solicite um orçamento para seu site, sistema sob medida, e-commerce, landing page ou SaaS. Resposta rápida e proposta personalizada.',
      path: '/orcamento',
      companyName: res.locals.company.companyName,
    }),
    schemas: [seo.breadcrumbSchema(breadcrumbs)],
  });
}

async function showContact(req, res) {
  const values = {};
  if (forms.contactProjectTypes.some((option) => option.value === req.query.tipo)) values.projectType = req.query.tipo;
  await renderContact(req, res, { values, success: req.query.enviado === '1' });
}

async function submitContact(req, res) {
  try {
    await leadService.createFromContact(req.body, requestMeta(req));
    res.redirect(303, '/contato?enviado=1#formulario');
  } catch (err) {
    if (err instanceof leadService.ValidationError) {
      return renderContact(req, res, { values: req.body, errors: err.errors, status: 422 });
    }
    throw err;
  }
}

async function showQuote(req, res) {
  const values = {};
  if (forms.quoteProjectTypes.some((option) => option.value === req.query.tipo)) values.projectType = req.query.tipo;
  if (typeof req.query.plano === 'string' && /^[a-z0-9-]{1,140}$/.test(req.query.plano)) values.plan = req.query.plano;
  await renderQuote(req, res, { values, success: req.query.enviado === '1' });
}

async function submitQuote(req, res) {
  if (req.uploadError) {
    discardUpload(req.file);
    return renderQuote(req, res, { values: req.body, errors: { attachment: req.uploadError }, status: 422 });
  }
  try {
    await leadService.createFromQuote(req.body, req.file, requestMeta(req));
    res.redirect(303, '/orcamento?enviado=1#formulario');
  } catch (err) {
    discardUpload(req.file);
    if (err instanceof leadService.ValidationError) {
      return renderQuote(req, res, { values: req.body, errors: err.errors, status: 422 });
    }
    throw err;
  }
}

module.exports = { showContact, submitContact, showQuote, submitQuote };
