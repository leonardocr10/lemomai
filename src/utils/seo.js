/**
 * Metadados de SEO e dados estruturados (schema.org / JSON-LD).
 * Tudo é derivado de company settings + conteúdo, nada fixo nas views.
 */
const config = require('../config');
const { buildWhatsAppUrl } = require('./whatsapp');

const DEFAULT_IMAGE = '/images/og/og-default.jpg';
const absoluteUrl = (path = '/') => (/^https?:\/\//.test(path) ? path : `${config.appUrl}${path.startsWith('/') ? '' : '/'}${path}`);

/**
 * @param {object} options
 * @param {string} options.title        Título da página (sem o nome da empresa)
 * @param {string} options.description  Meta description (ideal: 140–160 caracteres)
 * @param {string} options.path         Caminho canônico, ex.: /servicos
 * @param {boolean} options.brandFirst  Nome da empresa antes do título (home)
 */
function buildSeo({ title, description, path = '/', image = DEFAULT_IMAGE, type = 'website', noindex = false, companyName = 'Lenom.AI', brandFirst = false }) {
  let fullTitle = companyName;
  if (title) fullTitle = brandFirst ? `${companyName} | ${title}` : `${title} | ${companyName}`;
  return {
    title: fullTitle,
    description,
    canonical: absoluteUrl(path.split('?')[0].split('#')[0]),
    image: absoluteUrl(image),
    type,
    noindex,
    siteName: companyName,
    locale: 'pt_BR',
  };
}

const sameAs = (company) => [company.instagram, company.linkedin, company.youtube].filter(Boolean);

function organizationSchema(company) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${config.appUrl}/#organization`,
    name: company.companyName,
    url: config.appUrl,
    logo: absoluteUrl(`${company.logo || '/images/brand/logo-horizontal'}.png`),
    email: company.email,
    telephone: company.phone,
    sameAs: sameAs(company),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: company.phone,
        email: company.email,
        areaServed: 'BR',
        availableLanguage: ['Portuguese'],
      },
    ],
  };
}

function localBusinessSchema(company) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${config.appUrl}/#localbusiness`,
    name: company.companyName,
    description: company.tagline,
    url: config.appUrl,
    image: absoluteUrl(DEFAULT_IMAGE),
    logo: absoluteUrl(`${company.logo || '/images/brand/logo-horizontal'}.png`),
    email: company.email,
    telephone: company.phone,
    priceRange: 'R$ 1.290 - R$ 25.000+',
    address: {
      '@type': 'PostalAddress',
      streetAddress: company.address || undefined,
      addressLocality: company.city,
      addressRegion: company.state,
      addressCountry: company.country || 'BR',
    },
    areaServed: { '@type': 'Country', name: 'Brasil' },
    openingHours: company.openingHours,
    sameAs: sameAs(company),
    potentialAction: buildWhatsAppUrl({ phone: company.whatsapp })
      ? { '@type': 'CommunicateAction', target: buildWhatsAppUrl({ phone: company.whatsapp }) }
      : undefined,
  };
}

function serviceSchema(service, company) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description || service.shortDescription,
    url: absoluteUrl(`/servicos/${service.slug}`),
    serviceType: service.name,
    provider: { '@id': `${config.appUrl}/#organization`, name: company.companyName },
    areaServed: { '@type': 'Country', name: 'Brasil' },
  };
}

function serviceListSchema(services, company) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: serviceSchema(service, company),
    })),
  };
}

function offerCatalogSchema(plans, company) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: `Planos ${company.companyName}`,
    itemListElement: plans
      .filter((plan) => plan.price !== null)
      .map((plan) => ({
        '@type': 'Offer',
        name: plan.name,
        description: plan.description,
        price: Number(plan.price).toFixed(2),
        priceCurrency: 'BRL',
        url: absoluteUrl(plan.ctaHref || '/planos'),
        seller: { '@id': `${config.appUrl}/#organization` },
      })),
  };
}

function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}

/** JSON seguro para <script type="application/ld+json"> (evita fechar a tag). */
const jsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c');

module.exports = {
  absoluteUrl,
  buildSeo,
  organizationSchema,
  localBusinessSchema,
  serviceSchema,
  serviceListSchema,
  offerCatalogSchema,
  faqSchema,
  breadcrumbSchema,
  jsonLd,
};
