const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATA_DRIVER = 'sqlite';
process.env.DATA_FILE = ':memory:';
process.env.ADMIN_USER = 'dono';
process.env.ADMIN_PASSWORD = 'senha-forte-123';

const createApp = require('../src/app');
const { createClient } = require('./helpers/admin-client');

let server;
let base;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

async function loggedClient() {
  const client = createClient(base);
  await client.login('dono', 'senha-forte-123');
  return client;
}

test('/admin sem sessão redireciona para o login', async () => {
  const client = createClient(base);
  const response = await client.get('/admin');
  assert.equal(response.status, 302);
  assert.equal(response.location, '/admin/login');
});

test('tela de login tem banner animado, noindex e CSRF', async () => {
  const client = createClient(base);
  const response = await client.get('/admin/login');
  assert.equal(response.status, 200);
  assert.match(response.body, /aria-label="Lenom\.AI"/);
  assert.match(response.body, /noindex/);
  assert.match(response.body, /name="_csrf"/);
});

test('login inválido é recusado', async () => {
  const client = createClient(base);
  const response = await client.login('dono', 'errada');
  assert.equal(response.status, 401);
  assert.match(response.body, /Usuário ou senha inválidos/);
});

test('login sem CSRF é bloqueado', async () => {
  const client = createClient(base);
  await client.get('/admin/login');
  const response = await client.post('/admin/login', { username: 'dono', password: 'senha-forte-123' }, { withCsrf: false });
  assert.equal(response.status, 403);
});

test('login válido abre o painel e logout encerra a sessão', async () => {
  const client = createClient(base);
  const response = await client.login('dono', 'senha-forte-123');
  assert.equal(response.status, 302);
  assert.equal(response.location, '/admin');
  const panel = await client.get('/admin');
  assert.equal(panel.status, 200);
  assert.match(panel.body, /Painel/);

  const logout = await client.post('/admin/logout');
  assert.equal(logout.status, 302);
  assert.equal((await client.get('/admin')).status, 302);
});

const inputValue = (html, name) => html.match(new RegExp(`name="${name}"[^>]*value="([^"]*)"`))?.[1] ?? '';

test('editar preço de plano reflete na home', async () => {
  const client = await loggedClient();
  const list = await client.get('/admin/planos');
  assert.equal(list.status, 200);
  const id = list.body.match(/href="\/admin\/planos\/(\d+)"/)[1];
  const form = await client.get(`/admin/planos/${id}`);
  const value = (name) => inputValue(form.body, name);
  const features = form.body.match(/name="features"[^>]*>([\s\S]*?)<\/textarea>/)[1];

  const response = await client.post(`/admin/planos/${id}`, {
    name: value('name'), slug: value('slug'), category: 'project', icon: value('icon'), price: '1.777,00',
    billingType: 'one-time', pricePrefix: value('pricePrefix'), badge: value('badge'), description: value('description'),
    ctaText: value('ctaText'), ctaHref: value('ctaHref'), features, displayOrder: '1', active: 'on',
  });
  assert.equal(response.status, 302);
  assert.equal(response.location, '/admin/planos?salvo=1');
  const home = await (await fetch(`${base}/`)).text();
  assert.match(home, /1\.777/);
});

test('formulário inválido mostra erros por campo', async () => {
  const client = await loggedClient();
  await client.get('/admin/faq/novo');
  const response = await client.post('/admin/faq', { question: '', answer: '' });
  assert.equal(response.status, 422);
  assert.match(response.body, /Informe a pergunta/);
});

test('FAQ: criar e excluir', async () => {
  const client = await loggedClient();
  await client.get('/admin/faq/novo');
  const created = await client.post('/admin/faq', { question: 'Pergunta de teste?', answer: 'Resposta de teste.', displayOrder: '50', active: 'on' });
  assert.equal(created.status, 302);
  const list = await client.get('/admin/faq');
  assert.match(list.body, /Pergunta de teste\?/);
  const id = [...list.body.matchAll(/\/admin\/faq\/(\d+)\/excluir/g)].pop()[1];
  const removed = await client.post(`/admin/faq/${id}/excluir`);
  assert.equal(removed.status, 302);
  assert.doesNotMatch((await client.get('/admin/faq')).body, /Pergunta de teste\?/);
});

test('ID inexistente responde 404', async () => {
  const client = await loggedClient();
  assert.equal((await client.get('/admin/planos/99999')).status, 404);
  assert.equal((await client.get('/admin/planos/abc')).status, 404);
});

test('dados da empresa: salvar telefone reflete no site', async () => {
  const client = await loggedClient();
  const form = await client.get('/admin/empresa');
  assert.equal(form.status, 200);
  const names = ['companyName', 'legalName', 'tagline', 'email', 'whatsapp', 'instagram', 'linkedin', 'youtube',
    'address', 'city', 'state', 'serviceArea', 'openingHours', 'businessHoursLabel'];
  const fields = Object.fromEntries(names.map((n) => [n, inputValue(form.body, n)]));
  fields.whatsappMessage = form.body.match(/name="whatsappMessage"[^>]*>([\s\S]*?)<\/textarea>/)[1];
  const response = await client.post('/admin/empresa', { ...fields, phone: '(21) 99999-1234' });
  assert.equal(response.status, 302);
  assert.match(await (await fetch(`${base}/contato`)).text(), /\(21\) 99999-1234/);
});

test('lead enviado pelo site aparece no painel e muda de status', async () => {
  const visitor = createClient(base);
  await visitor.get('/contato');
  await visitor.post('/contato', {
    name: 'Cliente Painel', email: 'cliente@painel.com', whatsapp: '(11) 98888-7777',
    projectType: 'landing-page', message: 'Quero uma landing page.', acceptPrivacy: 'on',
  });
  const client = await loggedClient();
  const list = await client.get('/admin/leads');
  assert.match(list.body, /Cliente Painel/);
  const id = list.body.match(/href="\/admin\/leads\/(\d+)">Cliente Painel/)[1];
  const detail = await client.get(`/admin/leads/${id}`);
  assert.match(detail.body, /Quero uma landing page\./);
  const changed = await client.post(`/admin/leads/${id}/status`, { status: 'contacted' });
  assert.equal(changed.status, 302);
  assert.match((await client.get('/admin/leads?status=contacted')).body, /Cliente Painel/);
  assert.doesNotMatch((await client.get('/admin/leads?status=new')).body, /Cliente Painel/);
});

test('troca de senha exige a senha atual', async () => {
  const client = await loggedClient();
  await client.get('/admin/senha');
  const wrong = await client.post('/admin/senha', { currentPassword: 'x', newPassword: 'nova-senha-123', confirmPassword: 'nova-senha-123' });
  assert.equal(wrong.status, 422);
  assert.match(wrong.body, /Senha atual incorreta/);
  const ok = await client.post('/admin/senha', { currentPassword: 'senha-forte-123', newPassword: 'nova-senha-123', confirmPassword: 'nova-senha-123' });
  assert.equal(ok.status, 302);
  assert.equal((await createClient(base).login('dono', 'nova-senha-123')).status, 302);
  // Volta a senha original para não afetar os outros testes.
  await client.get('/admin/senha');
  await client.post('/admin/senha', { currentPassword: 'nova-senha-123', newPassword: 'senha-forte-123', confirmPassword: 'senha-forte-123' });
});
