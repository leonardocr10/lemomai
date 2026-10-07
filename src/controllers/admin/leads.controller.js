const repositories = require('../../repositories');
const forms = require('../../config/forms');
const HttpError = require('../../utils/http-error');
const { LEAD_STATUS } = require('../../utils/admin-format');
const { validateAdmin } = require('../../validators/admin.validator');

const PAGE_SIZE = 25;

async function findOr404(id) {
  const lead = await repositories.leads.findById(id);
  if (!lead) throw HttpError.notFound('Lead não encontrado.');
  return lead;
}

async function list(req, res, next) {
  try {
    const status = LEAD_STATUS[req.query.status] ? req.query.status : undefined;
    const page = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
    const [leads, total] = await Promise.all([
      repositories.leads.findAll({ status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      repositories.leads.count({ status }),
    ]);
    res.renderAdmin('leads/list', {
      title: 'Leads',
      section: 'leads',
      leads,
      status,
      page,
      pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      statuses: LEAD_STATUS,
    });
  } catch (err) {
    next(err);
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
    ['Mensagem', lead.message],
    ['Anexo', lead.attachment && `${lead.attachment.originalName} (storage/uploads/${lead.attachment.storedName})`],
    ['IP', lead.ipAddress],
  ].filter(([, value]) => value);
}

async function show(req, res, next) {
  try {
    const lead = await findOr404(req.params.id);
    res.renderAdmin('leads/show', {
      title: `Lead #${lead.id}`,
      section: 'leads',
      lead,
      rows: detailRows(lead),
      statuses: LEAD_STATUS,
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
    res.redirect(302, `/admin/leads/${lead.id}?salvo=1`);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, show, updateStatus };
