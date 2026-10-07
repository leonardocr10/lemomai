const repositories = require('../../repositories');
const forms = require('../../config/forms');
const HttpError = require('../../utils/http-error');
const { LEAD_STATUS } = require('../../utils/admin-format');
const { parseGrid, gridUrl, pageItems, PER_PAGE } = require('../../utils/admin-grid');
const { buildWhatsAppUrl } = require('../../utils/whatsapp');
const { validateAdmin } = require('../../validators/admin.validator');

const BASE = '/admin/leads';
const GRID = { sortable: ['createdAt', 'name', 'email', 'source', 'status'], defaultSort: 'createdAt', defaultDir: 'desc' };

async function findOr404(id) {
  const lead = await repositories.leads.findById(id);
  if (!lead) throw HttpError.notFound('Lead não encontrado.');
  return lead;
}

const parseIds = (value) =>
  [...new Set([].concat(value || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);

async function list(req, res, next) {
  try {
    const status = LEAD_STATUS[req.query.status] ? req.query.status : undefined;
    const state = { ...parseGrid(req.query, GRID), extra: { status } };
    const filter = { status, q: state.q };
    const [leads, total, ...counts] = await Promise.all([
      repositories.leads.findAll({ ...filter, sort: state.sort, dir: state.dir, limit: state.per, offset: state.offset }),
      repositories.leads.count(filter),
      repositories.leads.count({ q: state.q }),
      ...Object.keys(LEAD_STATUS).map((key) => repositories.leads.count({ status: key, q: state.q })),
    ]);
    const pages = Math.max(1, Math.ceil(total / state.per));
    const url = (overrides) => gridUrl(BASE, state, GRID, overrides);
    if (state.page > pages) return res.redirect(302, url({ page: pages }));

    const [all, ...byStatus] = counts;
    return res.renderAdmin('leads/list', {
      title: 'Leads',
      pretitle: 'Contatos e orçamentos recebidos pelo site',
      section: 'leads',
      leads,
      status,
      statuses: LEAD_STATUS,
      tabs: [
        { key: '', label: 'Todos', count: all },
        ...Object.entries(LEAD_STATUS).map(([key, label], i) => ({ key, label, count: byStatus[i] })),
      ],
      notice: req.query.lote !== undefined ? `${Number(req.query.lote) || 0} lead(s) atualizado(s).` : null,
      grid: {
        base: BASE,
        state,
        total,
        pages,
        perPage: PER_PAGE,
        pageItems: pageItems(state.page, pages),
        url,
        searchPlaceholder: 'Buscar nome, e-mail ou mensagem…',
      },
    });
  } catch (err) {
    return next(err);
  }
}

/** Linhas exibidas no detalhe, com os rótulos dos selects do site. */
function detailRows(lead) {
  const projectTypes = lead.source === 'quote' ? forms.quoteProjectTypes : forms.contactProjectTypes;
  return [
    ['Origem', lead.source === 'quote' ? 'Formulário de orçamento' : 'Formulário de contato'],
    ['Nome', lead.name],
    ['Empresa', lead.company],
    ['E-mail', lead.email],
    ['Telefone / WhatsApp', lead.phone],
    ['Tipo de projeto', lead.projectType && forms.labelOf(projectTypes, lead.projectType)],
    ['Plano de interesse', lead.planSlug],
    ['Prazo', lead.deadline && forms.labelOf(forms.deadlines, lead.deadline)],
    ['Orçamento', lead.budgetRange && forms.labelOf(forms.budgetRanges, lead.budgetRange)],
    ['Anexo', lead.attachment && `${lead.attachment.originalName} (storage/uploads/${lead.attachment.storedName})`],
    ['IP', lead.ipAddress],
  ].filter(([, value]) => value);
}

async function show(req, res, next) {
  try {
    const lead = await findOr404(req.params.id);
    res.renderAdmin('leads/show', {
      title: lead.name || `Lead #${lead.id}`,
      pretitle: `Lead #${lead.id}`,
      section: 'leads',
      actions: [{ href: BASE, label: 'Voltar', icon: 'arrow-left', variant: 'btn-outline-secondary' }],
      lead,
      rows: detailRows(lead),
      statuses: LEAD_STATUS,
      whatsappUrl: lead.phone ? buildWhatsAppUrl({ phone: lead.phone, message: `Olá, ${lead.name || ''}! Aqui é da Lenom.AI.` }) : null,
      notice: req.query.salvo ? 'Status atualizado.' : null,
    });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const lead = await findOr404(req.params.id);
    const result = validateAdmin('leadStatus', req.body);
    if (!result.success) throw HttpError.badRequest(result.errors.status);
    await repositories.leads.updateStatus(lead.id, result.data.status);
    res.redirect(302, `${BASE}/${lead.id}?salvo=1`);
  } catch (err) {
    next(err);
  }
}

/** Ação em massa: muda o status dos leads selecionados. */
async function bulk(req, res, next) {
  try {
    const result = validateAdmin('leadStatus', req.body);
    if (req.body?.action !== 'status' || !result.success) throw HttpError.badRequest('Status inválido.');
    let done = 0;
    for (const id of parseIds(req.body.ids)) {
      if (!(await repositories.leads.findById(id))) continue;
      await repositories.leads.updateStatus(id, result.data.status);
      done += 1;
    }
    res.redirect(302, `${BASE}?lote=${done}`);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, show, updateStatus, bulk };
