/**
 * Validação server-side dos formulários de contato e orçamento.
 * O navegador também valida (HTML5 + JS), mas o servidor é a fonte da verdade.
 */
const { z } = require('zod');
const forms = require('../config/forms');
const { sanitizeObject } = require('../utils/sanitize');

const values = (options) => options.map((option) => option.value);
const optionalString = (max) =>
  z.string().trim().max(max, `Use no máximo ${max} caracteres.`).optional().or(z.literal('')).transform((v) => v || null);

// `error` cobre campo ausente/tipo inválido; as demais mensagens cobrem regras.
const requiredText = (message) => z.string({ error: message }).trim();

const name = requiredText('Informe seu nome.').min(2, 'Informe seu nome.').max(120, 'Nome muito longo.');
const email = requiredText('Informe um e-mail válido.').toLowerCase().max(160).pipe(z.email('Informe um e-mail válido.'));
const phone = requiredText('Informe um telefone com DDD.').refine((value) => {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 13;
  }, 'Informe um telefone com DDD.');
const oneOf = (options, message) =>
  z.string({ error: message }).refine((value) => values(options).includes(value), message);
const acceptPrivacy = z
  .any()
  .refine((value) => value === 'on' || value === 'true' || value === true, 'É necessário aceitar a Política de Privacidade.');

/** Opcional, mas se vier preenchido precisa ser válido. */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(160)
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || z.email().safeParse(value).success, 'Informe um e-mail válido.');
const optionalOneOf = (options, message) =>
  z
    .string()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || values(options).includes(value), message);

/**
 * Contato rápido: só nome, WhatsApp, mensagem e o aceite são obrigatórios.
 * E-mail, empresa, tipo de projeto e orçamento ajudam, mas não travam o envio.
 */
const contactSchema = z.object({
  name,
  company: optionalString(120),
  email: optionalEmail,
  whatsapp: phone,
  projectType: optionalOneOf(forms.contactProjectTypes, 'Tipo de projeto inválido.'),
  budgetRange: z
    .string()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || values(forms.budgetRanges).includes(value), 'Faixa de orçamento inválida.'),
  message: requiredText('Conte um pouco sobre o projeto.').min(10, 'Conte um pouco mais sobre o projeto (mín. 10 caracteres).').max(3000),
  acceptPrivacy,
});

const quoteSchema = z.object({
  name,
  company: optionalString(120),
  email,
  phone,
  projectType: oneOf(forms.quoteProjectTypes, 'Selecione o tipo de projeto.'),
  objective: requiredText('Descreva o objetivo do projeto.').min(10, 'Descreva o objetivo do projeto (mín. 10 caracteres).').max(5000),
  deadline: oneOf(forms.deadlines, 'Selecione o prazo desejado.'),
  budgetRange: oneOf(forms.budgetRanges, 'Selecione a faixa de investimento.'),
  plan: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .transform((value) => value || null),
  acceptPrivacy,
});

/** Converte o resultado do zod em { campo: 'mensagem' } para views e API. */
function toFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] ?? 'form';
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

/** Campo "website" é invisível para humanos: se vier preenchido, é bot. */
const isSpam = (input = {}) => typeof input.website === 'string' && input.website.trim() !== '';

function validate(schema, input) {
  const result = schema.safeParse(sanitizeObject(input));
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: toFieldErrors(result.error) };
}

module.exports = {
  isSpam,
  contactSchema,
  quoteSchema,
  validateContact: (input) => validate(contactSchema, input),
  validateQuote: (input) => validate(quoteSchema, input),
};
