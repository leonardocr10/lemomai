const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DRIVER = 'sqlite';
process.env.DATA_FILE = ':memory:';

const { getDb } = require('../src/db/sqlite');

test('banco novo é populado com os dados de exemplo', () => {
  const db = getDb();
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM plans').get().n >= 6);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM faq').get().n > 0);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM testimonials').get().n > 0);
  const company = JSON.parse(db.prepare('SELECT data FROM company_settings WHERE id = 1').get().data);
  assert.equal(company.companyName, 'Lenom.AI');
  assert.equal(getDb(), db, 'getDb reutiliza a conexão');
});

const repositories = require('../src/repositories');

test('driver sqlite selecionado por DATA_DRIVER', () => {
  assert.equal(repositories.driver, 'sqlite');
});

test('planos: público só vê ativos; admin vê todos; CRUD funciona', async () => {
  const created = await repositories.plans.create({
    name: 'Plano Teste', slug: 'plano-teste', category: 'project', price: 99.9, billingType: 'one-time',
    features: ['Um', 'Dois'], highlighted: false, active: false, displayOrder: 99,
  });
  assert.deepEqual(created.features, ['Um', 'Dois']);
  assert.equal(created.active, false);
  assert.equal(await repositories.plans.findBySlug('plano-teste'), null);
  assert.ok((await repositories.plans.findAllAdmin()).some((p) => p.id === created.id));

  const updated = await repositories.plans.update(created.id, { active: true, price: 120 });
  assert.equal(updated.price, 120);
  assert.equal((await repositories.plans.findBySlug('plano-teste')).name, 'Plano Teste');
  assert.ok((await repositories.plans.findAll({ category: 'project' })).some((p) => p.slug === 'plano-teste'));

  assert.equal(await repositories.plans.remove(created.id), true);
  assert.equal(await repositories.plans.findById(created.id), null);
});

test('empresa e leads', async () => {
  const company = await repositories.company.get();
  await repositories.company.update({ ...company, phone: '(11) 0000-0000' });
  assert.equal((await repositories.company.get()).phone, '(11) 0000-0000');

  const lead = await repositories.leads.create({ source: 'contact', name: 'Ana', email: 'ana@x.com', message: 'Oi', status: 'new' });
  assert.equal(lead.status, 'new');
  assert.equal(lead.message, 'Oi');
  await repositories.leads.updateStatus(lead.id, 'contacted');
  assert.equal((await repositories.leads.findById(lead.id)).status, 'contacted');
  assert.equal(await repositories.leads.count({ status: 'contacted' }), 1);
  assert.equal((await repositories.leads.findAll({ status: 'contacted' })).length, 1);
});

test('banco novo traz os 3 banners iniciais', async () => {
  const banners = await repositories.banners.findAll();
  assert.equal(banners.length, 3);
  for (const banner of banners) {
    assert.match(banner.image, /^\/images\/banners\//);
    assert.ok(banner.alt.length > 10);
  }
});

test('findPage: busca, ordena e pagina; total ignora a paginação', async () => {
  const found = await repositories.plans.findPage({ q: 'landing', searchColumns: ['name', 'slug', 'description'] });
  assert.equal(found.total, 1);
  assert.equal(found.items[0].slug, 'landing-page');

  const byPrice = await repositories.plans.findPage({ sort: 'price', dir: 'desc', limit: 2 });
  assert.equal(byPrice.items.length, 2);
  assert.ok(byPrice.total > 2);
  assert.ok(byPrice.items[0].price >= byPrice.items[1].price);

  // Curingas do LIKE são tratados como texto.
  assert.equal((await repositories.plans.findPage({ q: '%', searchColumns: ['name'] })).total, 0);
});

test('leads: busca por nome ou e-mail', async () => {
  await repositories.leads.create({ source: 'contact', name: 'Beatriz Souza', email: 'bia@empresa.com', status: 'new' });
  assert.equal((await repositories.leads.findAll({ q: 'beatriz' })).length, 1);
  assert.equal(await repositories.leads.count({ q: 'empresa.com' }), 1);
  assert.equal(await repositories.leads.count({ q: 'ninguem' }), 0);
});

test('migração troca banners de exemplo antigos pelos atuais e mantém os enviados pelo painel', () => {
  const { DatabaseSync } = require('node:sqlite');
  const { SCHEMA } = require('../src/db/schema');
  const { seed } = require('../src/db/seed');
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  const insert = db.prepare('INSERT INTO banners (title, alt, href, image, active, display_order) VALUES (?, ?, ?, ?, 1, ?)');
  for (const n of [1, 2, 3, 4]) insert.run(`Antigo ${n}`, 'Banner antigo de exemplo', '/orcamento', `/images/banners/banner-${n}.webp`, n);
  insert.run('Versão 2', 'Banner da segunda leva', '/orcamento', '/images/banners/sites-sob-medida-claro.webp', 5);
  insert.run('Meu banner', 'Banner enviado pelo painel', '/sobre', '/uploads/banners/meu.webp', 9);

  seed(db, { withLeads: false });
  const images = db.prepare('SELECT image FROM banners ORDER BY display_order').all().map((row) => row.image);
  assert.equal(images.filter((image) => image.startsWith('/images/banners/banner-') || image.includes('sites-sob-medida')).length, 0);
  assert.equal(images.filter((image) => image.startsWith('/images/banners/')).length, 3);
  assert.ok(images.includes('/uploads/banners/meu.webp'));

  // Rodar de novo não duplica nada.
  seed(db, { withLeads: false });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM banners').get().n, 4);

  // Um exemplo atual excluído pelo painel não volta.
  db.prepare("DELETE FROM banners WHERE image = '/images/banners/sites-crescimento.webp'").run();
  seed(db, { withLeads: false });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM banners').get().n, 3);
});
