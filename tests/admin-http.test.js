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

const fs = require('node:fs');
const path = require('node:path');

// PNG 1×1 válido.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const png = (filename = 'banner.png') => ({ data: PNG, filename, type: 'image/png' });
const publicFile = (url) => path.resolve(__dirname, '../public', `.${url}`);

test('banners: lista os 3 iniciais com miniatura', async () => {
  const client = await loggedClient();
  const list = await client.get('/admin/banners');
  assert.equal(list.status, 200);
  const files = ['sites-crescimento', 'projetos-geram-crescimento', 'automacao-produtividade'];
  for (const name of files) assert.ok(list.body.includes(`/images/banners/${name}.webp`), name);
});

test('banners: criar com imagem aparece na home; excluir apaga o arquivo', async () => {
  const client = await loggedClient();
  await client.get('/admin/banners/novo');
  const created = await client.postMultipart('/admin/banners',
    { title: 'Banner de teste', alt: 'Texto alternativo do banner de teste', href: '/sobre', displayOrder: '9', active: 'on' },
    { image: png() });
  assert.equal(created.status, 302);

  const home = await (await fetch(`${base}/`)).text();
  assert.match(home, /Texto alternativo do banner de teste/);
  const url = home.match(/src="(\/uploads\/banners\/[^"]+)" alt="Texto alternativo do banner de teste"/)[1];
  assert.ok(fs.existsSync(publicFile(url)));

  const list = await client.get('/admin/banners');
  const id = list.body.match(/href="\/admin\/banners\/(\d+)">Banner de teste/)[1];
  assert.equal((await client.post(`/admin/banners/${id}/excluir`)).status, 302);
  assert.equal(fs.existsSync(publicFile(url)), false);
});

test('banners: arquivo que não é imagem é recusado e não fica no disco', async () => {
  const client = await loggedClient();
  await client.get('/admin/banners/novo');
  const before = fs.readdirSync(path.resolve(__dirname, '../public/uploads/banners')).length;
  const response = await client.postMultipart('/admin/banners',
    { title: 'Falso', alt: 'Arquivo falso com extensão png', active: 'on' },
    { image: { data: Buffer.from('isto não é uma imagem'), filename: 'falso.png', type: 'image/png' } });
  assert.equal(response.status, 422);
  assert.match(response.body, /Arquivo de imagem inválido/);
  assert.equal(fs.readdirSync(path.resolve(__dirname, '../public/uploads/banners')).length, before);
});

test('banners: criar sem imagem pede a imagem', async () => {
  const client = await loggedClient();
  await client.get('/admin/banners/novo');
  const response = await client.postMultipart('/admin/banners', { title: 'Sem imagem', alt: 'Banner sem imagem enviada' });
  assert.equal(response.status, 422);
  assert.match(response.body, /Envie a imagem do banner/);
});

test('banners: envio multipart sem CSRF é bloqueado e o arquivo descartado', async () => {
  const client = await loggedClient();
  const before = fs.readdirSync(path.resolve(__dirname, '../public/uploads/banners')).length;
  const response = await client.postMultipart('/admin/banners', { title: 'X', alt: 'Sem token CSRF' }, { image: png() }, { withCsrf: false });
  assert.equal(response.status, 403);
  assert.equal(fs.readdirSync(path.resolve(__dirname, '../public/uploads/banners')).length, before);
});

test('banners: desativar tira o banner da home', async () => {
  const client = await loggedClient();
  const form = await client.get('/admin/banners/1');
  const fields = { title: inputValue(form.body, 'title'), href: inputValue(form.body, 'href'), displayOrder: '1' };
  fields.alt = form.body.match(/name="alt"[^>]*>([\s\S]*?)<\/textarea>/)[1];
  assert.equal((await client.postMultipart('/admin/banners/1', fields)).status, 302);
  assert.doesNotMatch(await (await fetch(`${base}/`)).text(), /sites-crescimento.webp/);
  await client.get('/admin/banners/1');
  await client.postMultipart('/admin/banners/1', { ...fields, active: 'on' });
  assert.match(await (await fetch(`${base}/`)).text(), /sites-crescimento.webp/);
});

test('layout do painel usa o Tabler servido localmente, sem o CSS do site', async () => {
  const client = await loggedClient();
  const page = await client.get('/admin');
  assert.match(page.body, /href="\/vendor\/tabler\/css\/tabler\.min\.css\?v=/);
  assert.doesNotMatch(page.body, /css\/main\.css/);
  assert.equal((await fetch(`${base}/vendor/tabler/css/tabler.min.css`)).status, 200);
  assert.equal((await fetch(`${base}/vendor/cropper/cropper.min.js`)).status, 200);
  const login = await createClient(base).get('/admin/login');
  assert.match(login.body, /tabler\.min\.css/);
});

test('grid: busca, ordenação e paginação pela URL', async () => {
  const client = await loggedClient();
  const search = await client.get('/admin/planos?q=landing');
  assert.match(search.body, />Landing Page</);
  assert.doesNotMatch(search.body, />Essencial</);

  const prices = (html) => [...html.matchAll(/R\$\s([\d.]+),\d\d/g)].map((m) => Number(m[1].replace(/\./g, '')));
  const sorted = prices((await client.get('/admin/planos?sort=price&dir=desc')).body);
  assert.ok(sorted.length > 3);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => b - a));
  assert.match((await client.get('/admin/planos?sort=price&dir=desc')).body, /aria-sort="descending"/);

  const first = await client.get('/admin/planos?per=10&sort=name');
  assert.match(first.body, /Mostrando <strong>1–\d+<\/strong> de <strong>\d+<\/strong>/);
  // Página além da última volta para a última página existente.
  const beyond = await client.get('/admin/planos?per=10&page=99&sort=name');
  assert.equal(beyond.status, 302);
  assert.equal(beyond.location, '/admin/planos?sort=name&per=10');

  // Coluna de ordenação inválida é ignorada (volta para a ordem padrão).
  assert.equal((await client.get('/admin/planos?sort=password_hash')).status, 200);
});

test('ações em massa: desativar, ativar e excluir; sem CSRF é bloqueado', async () => {
  const client = await loggedClient();
  await client.get('/admin/faq/novo');
  for (const n of [1, 2]) {
    await client.post('/admin/faq', { question: `Pergunta em massa ${n}?`, answer: 'Resposta em massa.', displayOrder: '90', active: 'on' });
  }
  const list = await client.get('/admin/faq?q=em+massa');
  const ids = [...list.body.matchAll(/name="ids" value="(\d+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 2);

  const deactivated = await bulk(client, '/admin/faq/lote', 'deactivate', ids);
  assert.equal(deactivated.status, 302);
  assert.match(deactivated.location, /lote=2&acao=deactivate/);
  assert.doesNotMatch(await (await fetch(`${base}/`)).text(), /Pergunta em massa 1/);

  await bulk(client, '/admin/faq/lote', 'activate', ids);
  assert.match(await (await fetch(`${base}/`)).text(), /Pergunta em massa 1/);

  const blocked = await bulk(client, '/admin/faq/lote', 'delete', ids, { withCsrf: false });
  assert.equal(blocked.status, 403);

  const deleted = await bulk(client, '/admin/faq/lote', 'delete', [...ids, 'abc', '-3']);
  assert.match(deleted.location, /lote=2&acao=delete/);
  assert.doesNotMatch((await client.get('/admin/faq?q=em+massa')).body, /Pergunta em massa/);
});

/** POST de ação em massa com ids repetidos (ids=1&ids=2), como o formulário envia. */
function bulk(client, path, action, ids, { withCsrf = true } = {}) {
  const form = new URLSearchParams({ action });
  for (const id of ids) form.append('ids', id);
  return client.postRaw(path, form, { withCsrf });
}

test('leads: busca, abas de status e mudança de status em massa', async () => {
  const visitor = createClient(base);
  for (const name of ['Lead Massa Um', 'Lead Massa Dois']) {
    await visitor.get('/contato');
    await visitor.post('/contato', {
      name, email: `${name.replace(/\s/g, '').toLowerCase()}@teste.com`, whatsapp: '(11) 97777-6666',
      projectType: 'saas', message: 'Mensagem de teste em massa.', acceptPrivacy: 'on',
    });
  }
  const client = await loggedClient();
  const list = await client.get('/admin/leads?q=lead+massa');
  assert.match(list.body, /Lead Massa Um/);
  assert.doesNotMatch(list.body, /Cliente Painel/);
  const ids = [...list.body.matchAll(/name="ids" value="(\d+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 2);

  const form = new URLSearchParams({ action: 'status', status: 'closed' });
  ids.forEach((id) => form.append('ids', id));
  const response = await client.postRaw('/admin/leads/lote', form);
  assert.equal(response.status, 302);
  const closed = await client.get('/admin/leads?status=closed&q=lead+massa');
  assert.equal([...closed.body.matchAll(/name="ids" value="(\d+)"/g)].length, 2);
  assert.match(closed.body, /aria-current="page"[^>]*>\s*Fechado/);

  const invalid = new URLSearchParams({ action: 'status', status: 'hackeado' });
  ids.forEach((id) => invalid.append('ids', id));
  assert.equal((await client.postRaw('/admin/leads/lote', invalid)).status, 400);
});
