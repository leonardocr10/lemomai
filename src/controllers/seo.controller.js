/**
 * sitemap.xml, robots.txt e web manifest gerados dinamicamente a partir
 * do conteúdo (novos serviços/projetos entram no sitemap automaticamente).
 */
const config = require('../config');
const contentService = require('../services/content.service');
const { absoluteUrl } = require('../utils/seo');

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/servicos', priority: '0.9', changefreq: 'monthly' },
  { path: '/planos', priority: '0.9', changefreq: 'monthly' },
  { path: '/portfolio', priority: '0.8', changefreq: 'monthly' },
  { path: '/sobre', priority: '0.6', changefreq: 'yearly' },
  { path: '/contato', priority: '0.7', changefreq: 'yearly' },
  { path: '/orcamento', priority: '0.8', changefreq: 'yearly' },
  { path: '/politica-de-privacidade', priority: '0.2', changefreq: 'yearly' },
  { path: '/termos-de-uso', priority: '0.2', changefreq: 'yearly' },
  { path: '/politica-de-cookies', priority: '0.2', changefreq: 'yearly' },
];

const xmlEscape = (value) => String(value).replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

async function sitemap(req, res) {
  const [services, projects] = await Promise.all([contentService.listServices(), contentService.listPortfolio()]);
  const pages = [
    ...STATIC_PAGES,
    ...services.map((service) => ({ path: `/servicos/${service.slug}`, priority: '0.8', changefreq: 'monthly' })),
    ...projects.map((project) => ({ path: `/portfolio/${project.slug}`, priority: '0.6', changefreq: 'yearly' })),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${xmlEscape(absoluteUrl(page.path))}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;
  res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(xml);
}

function robots(req, res) {
  const lines = config.isProduction
    ? ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /admin', '', `Sitemap: ${absoluteUrl('/sitemap.xml')}`]
    : ['# Ambiente de desenvolvimento: não indexar', 'User-agent: *', 'Disallow: /'];
  res.set('Cache-Control', 'public, max-age=3600').type('text/plain').send(`${lines.join('\n')}\n`);
}

function manifest(req, res) {
  const { company } = res.locals;
  res.set('Cache-Control', 'public, max-age=86400').type('application/manifest+json').json({
    name: company.companyName,
    short_name: company.companyName,
    description: company.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f9f6',
    theme_color: '#0f2d4a',
    lang: 'pt-BR',
    icons: [
      { src: '/icons/icon-192.png?v=lenom', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png?v=lenom', sizes: '512x512', type: 'image/png' },
    ],
  });
}

module.exports = { sitemap, robots, manifest };
