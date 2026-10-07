const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATA_DRIVER = 'mock';
process.env.NODE_ENV = 'test';

const createApp = require('../src/app');

let server;
let base;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

const PAGES = [
  '/',
  '/servicos',
  '/servicos/criacao-de-sites',
  '/planos',
  '/portfolio',
  '/portfolio/cassiano3d',
  '/sobre',
  '/contato',
  '/orcamento',
  '/politica-de-privacidade',
  '/termos-de-uso',
  '/politica-de-cookies',
];

for (const path of PAGES) {
  test(`GET ${path} responde 200 com SEO básico`, async () => {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /<title>[^<]*Lenom\.AI[^<]*<\/title>/);
    assert.match(html, /<meta name="description"/);
    assert.match(html, /<link rel="canonical"/);
    assert.match(html, /property="og:image"/);
    assert.match(html, /application\/ld\+json/);
  });
}

test('rotas inexistentes retornam 404 (HTML e API)', async () => {
  assert.equal((await fetch(`${base}/nao-existe`)).status, 404);
  assert.equal((await fetch(`${base}/servicos/nao-existe`)).status, 404);
  const api = await fetch(`${base}/api/nao-existe`);
  assert.equal(api.status, 404);
  assert.equal((await api.json()).ok, false);
});

test('API pública retorna dados no formato { ok, data }', async () => {
  for (const endpoint of ['services', 'plans', 'portfolio', 'testimonials', 'faq']) {
    const body = await (await fetch(`${base}/api/${endpoint}`)).json();
    assert.equal(body.ok, true, endpoint);
    assert.ok(Array.isArray(body.data) && body.data.length > 0, endpoint);
  }
  const saas = await (await fetch(`${base}/api/plans?category=saas`)).json();
  assert.ok(saas.data.every((plan) => plan.category === 'saas'));
});

test('POST sem token CSRF é bloqueado com 403', async () => {
  const response = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Teste' }),
  });
  assert.equal(response.status, 403);
});

test('POST com CSRF válido e dados inválidos retorna 422 com erros por campo', async () => {
  const tokenResponse = await fetch(`${base}/api/csrf-token`);
  const cookie = tokenResponse.headers.get('set-cookie').split(';')[0];
  const { data } = await tokenResponse.json();
  const response = await fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': data.csrfToken, Cookie: cookie },
    body: JSON.stringify({ name: 'A' }),
  });
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.ok(body.errors.email);
  assert.ok(body.errors.message);
});

test('sitemap inclui páginas dinâmicas e robots bloqueia fora de produção', async () => {
  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  assert.match(sitemap, /\/servicos\/sistemas-sob-medida/);
  assert.match(sitemap, /\/portfolio\/cassiano3d/);
  const robots = await (await fetch(`${base}/robots.txt`)).text();
  assert.match(robots, /Disallow: \//);
});

test('cabeçalhos de segurança estão presentes', async () => {
  const response = await fetch(`${base}/`);
  assert.ok(response.headers.get('content-security-policy'));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('home: carrossel com o hero como 1º slide e os banners depois, com um único h1', async () => {
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /data-banner-carousel/);
  const heroAt = html.indexOf('banner-slide--hero');
  const bannerAt = html.indexOf('/images/banners/banner-1.webp');
  assert.ok(heroAt > 0 && bannerAt > heroAt, 'hero vem antes dos banners');
  assert.match(html, /<a class="banner-slide__link" href="\/portfolio"/);
  assert.equal(html.match(/<h1[\s>]/g).length, 1);
  assert.match(html, /<h1 class="hero__title"/);
  assert.match(html, /aria-label="1 de 5"/);
  assert.match(html, /rel="preload" as="image" type="image\/avif" href="\/images\/hero\//);
});
