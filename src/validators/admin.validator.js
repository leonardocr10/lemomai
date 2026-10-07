/**
 * Validação dos formulários do painel /admin.
 * Retorna { success, data } ou { success: false, errors: { campo: 'mensagem' } }.
 */
const { z } = require('zod');

function toFieldErrors(error) {
  const errors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] ?? 'form';
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

const checkbox = z.preprocess((value) => value === 'on' || value === 'true' || value === true, z.boolean());
const text = (max, message) => z.string({ error: message }).trim().min(1, message).max(max, `Máximo de ${max} caracteres.`);
const optional = (max) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres.`).optional().default('').transform((v) => v || null);
const displayOrder = z.coerce.number({ error: 'Use um número.' }).int('Use um número inteiro.').min(0).max(9999).default(0);
const link = z.string().trim().max(255)
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v), 'Use um caminho do site (/orcamento) ou um link https://.')
  .optional().default('').transform((v) => v || null);

/** Aceita "1290", "1290.5", "1.290", "1.290,50", "R$ 1.290,50". Vazio = null (sob consulta). */
function parsePrice(value) {
  const clean = String(value ?? '').replace(/R\$|\s/g, '');
  if (clean === '') return null;
  let number;
  if (clean.includes(',')) number = Number(clean.replace(/\./g, '').replace(',', '.'));
  else if (/^\d{1,3}(\.\d{3})+$/.test(clean)) number = Number(clean.replace(/\./g, ''));
  else number = Number(clean);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : Number.NaN;
}

const schemas = {
  login: z.object({
    username: z.string().trim().min(1, 'Informe o usuário.').max(80),
    password: z.string().min(1, 'Informe a senha.').max(200),
  }),

  plan: z.object({
    name: text(120, 'Informe o nome do plano.'),
    slug: z.string().trim().toLowerCase().min(1, 'Informe o slug.').max(140)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens.'),
    category: z.enum(['project', 'saas'], { error: 'Escolha a categoria.' }),
    icon: optional(60),
    price: z.string().optional().default('').transform(parsePrice)
      .refine((v) => !Number.isNaN(v), 'Preço inválido. Exemplos: 1290 ou 1.290,00.'),
    billingType: z.enum(['one-time', 'starting-at', 'monthly', 'custom'], { error: 'Escolha o tipo de cobrança.' }),
    pricePrefix: optional(40),
    highlighted: checkbox,
    badge: optional(40),
    description: optional(255),
    ctaText: optional(60),
    ctaHref: link,
    features: z.string().optional().default('')
      .transform((v) => v.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(200, 'Cada item pode ter até 200 caracteres.')).max(30, 'Máximo de 30 itens.')),
    active: checkbox,
    displayOrder,
  })
    .refine((plan) => plan.billingType === 'custom' || plan.price !== null,
      { path: ['price'], message: 'Informe o preço ou escolha "Sob consulta".' })
    .transform((plan) => (plan.billingType === 'custom' ? { ...plan, price: null } : plan)),

  faq: z.object({
    question: text(255, 'Informe a pergunta.'),
    answer: text(2000, 'Informe a resposta.'),
    active: checkbox,
    displayOrder,
  }),

  testimonial: z.object({
    author: text(120, 'Informe quem deu o depoimento.'),
    role: optional(120),
    company: optional(120),
    content: text(1000, 'Informe o depoimento.'),
    rating: z.coerce.number().int().min(1, 'Nota de 1 a 5.').max(5, 'Nota de 1 a 5.').default(5),
    active: checkbox,
    displayOrder,
  }),
};

function validateAdmin(name, input) {
  const result = schemas[name].safeParse(input || {});
  return result.success ? { success: true, data: result.data } : { success: false, errors: toFieldErrors(result.error) };
}

module.exports = { validateAdmin, schemas };
