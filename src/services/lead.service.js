/**
 * Captação de leads (contato e orçamento). Valida, persiste via repositório
 * (mock -> storage/leads.json | MySQL -> tabela leads) e dispara e-mails.
 */
const repositories = require('../repositories');
const forms = require('../config/forms');
const EmailService = require('./email.service');
const companyService = require('./company.service');
const { validateContact, validateQuote, isSpam } = require('../validators/lead.validator');
const logger = require('../utils/logger');

class ValidationError extends Error {
  constructor(errors) {
    super('Dados inválidos');
    this.name = 'ValidationError';
    this.status = 422;
    this.errors = errors;
  }
}

const requestMeta = (meta = {}) => ({
  ipAddress: meta.ip ? String(meta.ip).slice(0, 45) : null,
  userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 255) : null,
});

/** Resposta falsa de sucesso para bots: não salva nem envia e-mail. */
function spamResult(input, meta) {
  logger.warn('Envio descartado pelo honeypot', { ip: meta?.ip });
  return { id: null, spam: true, email: input.email };
}

async function persistAndNotify(lead, emailFields) {
  const saved = await repositories.leads.create(lead);
  logger.info(`Lead #${saved.id} recebido (${saved.source}) — ${saved.email}`);

  const company = await companyService.getSettings();
  // E-mails não bloqueiam a resposta em caso de falha (EmailService já trata erros).
  await Promise.all([
    EmailService.notifyNewLead(saved, emailFields),
    EmailService.sendLeadConfirmation(saved, company.companyName),
  ]);
  return saved;
}

async function createFromContact(input, meta) {
  if (isSpam(input)) return spamResult(input, meta);
  const result = validateContact(input);
  if (!result.success) throw new ValidationError(result.errors);
  const data = result.data;

  const lead = {
    source: 'contact',
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.whatsapp,
    projectType: data.projectType,
    budgetRange: data.budgetRange,
    message: data.message,
    status: 'new',
    ...requestMeta(meta),
  };

  return persistAndNotify(lead, [
    ['Nome', data.name],
    ['Empresa', data.company],
    ['E-mail', data.email],
    ['WhatsApp', data.whatsapp],
    ['Tipo de projeto', forms.labelOf(forms.contactProjectTypes, data.projectType)],
    ['Orçamento estimado', data.budgetRange && forms.labelOf(forms.budgetRanges, data.budgetRange)],
    ['Mensagem', data.message],
  ]);
}

async function createFromQuote(input, file, meta) {
  if (isSpam(input)) {
    if (file?.path) require('node:fs').promises.unlink(file.path).catch(() => {});
    return spamResult(input, meta);
  }
  const result = validateQuote(input);
  if (!result.success) throw new ValidationError(result.errors);
  const data = result.data;

  const attachment = file
    ? { originalName: file.originalname, storedName: file.filename, mimeType: file.mimetype, size: file.size }
    : null;

  const lead = {
    source: 'quote',
    name: data.name,
    company: data.company,
    email: data.email,
    phone: data.phone,
    projectType: data.projectType,
    budgetRange: data.budgetRange,
    deadline: data.deadline,
    planSlug: data.plan,
    message: data.objective,
    attachment,
    status: 'new',
    ...requestMeta(meta),
  };

  return persistAndNotify(lead, [
    ['Nome', data.name],
    ['Empresa', data.company],
    ['E-mail', data.email],
    ['Telefone', data.phone],
    ['Tipo de projeto', forms.labelOf(forms.quoteProjectTypes, data.projectType)],
    ['Plano de interesse', data.plan],
    ['Prazo desejado', forms.labelOf(forms.deadlines, data.deadline)],
    ['Faixa de investimento', forms.labelOf(forms.budgetRanges, data.budgetRange)],
    ['Objetivo', data.objective],
    ['Anexo', attachment && `${attachment.originalName} (storage/uploads/${attachment.storedName})`],
  ]);
}

module.exports = { createFromContact, createFromQuote, ValidationError };
