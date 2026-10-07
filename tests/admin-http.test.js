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
