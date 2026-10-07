const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DRIVER = 'mock';

const { buildWhatsAppUrl, normalizePhone } = require('../src/utils/whatsapp');
const format = require('../src/utils/format');
const { jsonLd } = require('../src/utils/seo');
const { sanitizeText } = require('../src/utils/sanitize');
const { validateContact, validateQuote, isSpam } = require('../src/validators/lead.validator');
const repositories = require('../src/repositories');

test('buildWhatsAppUrl normaliza número brasileiro e codifica a mensagem', () => {
  assert.equal(normalizePhone('(11) 98765-4321'), '5511987654321');
  assert.equal(normalizePhone('5511987654321'), '5511987654321');
  assert.equal(buildWhatsAppUrl({ phone: '(11) 98765-4321', message: 'Olá!' }), 'https://wa.me/5511987654321?text=Ol%C3%A1%21');
  assert.equal(buildWhatsAppUrl({ phone: '' }), null);
});

test('planPrice formata preço, mensalidade e sob consulta', () => {
  const price = format.planPrice({ price: 1290, billingType: 'one-time', pricePrefix: 'A partir de' });
  // Intl usa espaço não separável entre "R$" e o valor.
  assert.equal(price.amount.replace(/\s/g, ' '), 'R$ 1.290');
  assert.equal(price.prefix, 'A partir de');
  assert.equal(price.isCustom, false);
  assert.equal(format.planPrice({ price: 297, billingType: 'monthly' }).suffix, '/mês');
  assert.equal(format.planPrice({ price: null, billingType: 'custom' }).amount, 'Sob consulta');
});

test('jsonLd impede fechamento da tag <script>', () => {
  assert.ok(!jsonLd({ a: '</script><script>alert(1)</script>' }).includes('</script>'));
});

test('sanitizeText remove tags e caracteres de controle', () => {
  assert.equal(sanitizeText('  <b>ACME</b>\u0007 '), 'ACME');
});

test('validateContact aceita dados válidos e normaliza e-mail', () => {
  const result = validateContact({
    name: 'Maria',
    email: 'Maria@Exemplo.com',
    whatsapp: '(11) 91234-5678',
    projectType: 'e-commerce',
    message: 'Quero uma loja virtual.',
    acceptPrivacy: 'on',
  });
  assert.equal(result.success, true);
  assert.equal(result.data.email, 'maria@exemplo.com');
  assert.equal(result.data.budgetRange, null);
});

test('validateContact retorna mensagens em português por campo', () => {
  const result = validateContact({ projectType: 'invalido' });
  assert.equal(result.success, false);
  assert.equal(result.errors.name, 'Informe seu nome.');
  assert.equal(result.errors.projectType, 'Selecione o tipo de projeto.');
  assert.ok(result.errors.acceptPrivacy);
});

test('validateQuote exige prazo e faixa de investimento das opções', () => {
  const result = validateQuote({
    name: 'João',
    email: 'joao@ex.com',
    phone: '11987654321',
    projectType: 'sistema',
    objective: 'Sistema de estoque',
    deadline: 'amanha',
    budgetRange: '1-real',
    acceptPrivacy: 'on',
  });
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['budgetRange', 'deadline']);
});

test('isSpam detecta o honeypot preenchido', () => {
  assert.equal(isSpam({ website: 'http://spam' }), true);
  assert.equal(isSpam({ website: '' }), false);
});

test('repositório mock segue a interface e não expõe o objeto original', async () => {
  assert.equal(repositories.driver, 'mock');
  const saas = await repositories.plans.findAll({ category: 'saas' });
  assert.deepEqual(saas.map((plan) => plan.name), ['Essencial', 'Profissional', 'Gestão 360', 'Enterprise']);
  saas[0].name = 'alterado';
  const again = await repositories.plans.findBySlug('saas-essencial');
  assert.equal(again.name, 'Essencial');
  assert.equal(await repositories.portfolio.findBySlug('nao-existe'), null);
  const company = await repositories.company.get();
  assert.equal(company.companyName, 'Lenom.AI');
});
