/**
 * Telas de cadastro do painel: colunas da lista (com ordenação), busca e
 * campos do formulário (seções + coluna lateral) de cada recurso.
 * O comportamento fica em resource.controller.js.
 */
const repositories = require('../../repositories');
const { money, priceInput } = require('../../utils/admin-format');
const { resourceController } = require('./resource.controller');
const { uploadedUrl, removeUploadedFile, discardUploads } = require('../../middlewares/banner-upload');

const BILLING = [
  { value: 'one-time', label: 'Pagamento único' },
  { value: 'starting-at', label: 'A partir de' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'custom', label: 'Sob consulta' },
];
const CATEGORIES = [
  { value: 'project', label: 'Projeto (home)' },
  { value: 'saas', label: 'SaaS (/planos)' },
];

const ORDER_FIELD = { name: 'displayOrder', label: 'Ordem de exibição', type: 'number', hint: 'Menor aparece primeiro.' };
const ACTIVE_FIELD = { name: 'active', label: 'Exibir no site', type: 'switch' };
const ORDER_COLUMN = { label: 'Ordem', value: (item) => item.displayOrder, sort: 'displayOrder', num: true };

function planPrice(plan) {
  if (plan.billingType === 'custom') return 'Sob consulta';
  return `${money(plan.price)}${plan.billingType === 'monthly' ? '/mês' : ''}`;
}

const plans = resourceController({
  path: 'planos',
  section: 'plans',
  singular: 'Plano',
  plural: 'Planos e preços',
  schema: 'plan',
  uniqueField: 'slug',
  repo: () => repositories.plans,
  searchColumns: ['name', 'slug', 'description', 'badge'],
  searchPlaceholder: 'Buscar plano…',
  columns: [
    ORDER_COLUMN,
    { label: 'Nome', value: (p) => p.name, link: true, sort: 'name' },
    { label: 'Categoria', value: (p) => (p.category === 'saas' ? 'SaaS' : 'Projeto'), sort: 'category' },
    { label: 'Preço', value: planPrice, num: true, sort: 'price' },
    { label: 'Destaque', value: (p) => (p.highlighted ? 'Sim' : '—'), sort: 'highlighted' },
  ],
  defaults: {
    category: 'project', billingType: 'one-time', features: [], active: true, highlighted: false, displayOrder: 0,
    ctaText: 'Quero este plano',
  },
  toForm: (p) => ({ ...p, price: priceInput(p.price), features: (p.features || []).join('\n') }),
  fields: [
    { name: 'name', label: 'Nome', required: true },
    { name: 'slug', label: 'Slug (endereço)', required: true, hint: 'Ex.: site-institucional. Usado nos links de orçamento.' },
    { name: 'category', label: 'Categoria', type: 'select', options: CATEGORIES },
    { name: 'billingType', label: 'Tipo de cobrança', type: 'select', options: BILLING },
    { name: 'price', label: 'Preço', prefix: 'R$', hint: 'Ex.: 1.290,00. Pode ficar vazio só em "Sob consulta".', attrs: ' inputmode="decimal"' },
    { name: 'pricePrefix', label: 'Texto antes do preço', hint: 'Ex.: A partir de' },
    { name: 'description', label: 'Descrição curta', full: true },
    { name: 'features', label: 'Itens inclusos', type: 'textarea', rows: 8, full: true, hint: 'Um item por linha.' },
    { name: 'badge', label: 'Selo', hint: 'Ex.: Mais vendido' },
    { name: 'icon', label: 'Ícone', hint: 'Nome do ícone (ex.: layout, building, code).' },
    { name: 'ctaText', label: 'Texto do botão' },
    { name: 'ctaHref', label: 'Link do botão', hint: 'Ex.: /orcamento?plano=landing-page' },
    ORDER_FIELD,
    { name: 'highlighted', label: 'Destacar este plano', type: 'switch' },
    ACTIVE_FIELD,
  ],
  sections: [
    { title: 'Plano', fields: ['name', 'slug', 'category', 'description'] },
    { title: 'Preço', fields: ['billingType', 'price', 'pricePrefix', 'badge'] },
    { title: 'Itens inclusos', fields: ['features'] },
    { title: 'Botão', fields: ['ctaText', 'ctaHref', 'icon'] },
  ],
  sidebar: ['active', 'highlighted', 'displayOrder'],
});

const faq = resourceController({
  path: 'faq',
  section: 'faq',
  singular: 'Pergunta',
  plural: 'Perguntas frequentes',
  schema: 'faq',
  repo: () => repositories.faq,
  searchColumns: ['question', 'answer'],
  searchPlaceholder: 'Buscar pergunta ou resposta…',
  columns: [
    ORDER_COLUMN,
    { label: 'Pergunta', value: (f) => f.question, link: true, sort: 'question' },
  ],
  defaults: { active: true, displayOrder: 0 },
  toForm: (f) => ({ ...f }),
  fields: [
    { name: 'question', label: 'Pergunta', required: true, full: true },
    { name: 'answer', label: 'Resposta', type: 'textarea', rows: 6, required: true, full: true },
    ORDER_FIELD,
    ACTIVE_FIELD,
  ],
  sections: [{ title: 'Pergunta e resposta', fields: ['question', 'answer'] }],
  sidebar: ['active', 'displayOrder'],
});

const testimonials = resourceController({
  path: 'depoimentos',
  section: 'testimonials',
  singular: 'Depoimento',
  plural: 'Depoimentos',
  schema: 'testimonial',
  repo: () => repositories.testimonials,
  searchColumns: ['author', 'role', 'company', 'content'],
  searchPlaceholder: 'Buscar autor, empresa ou texto…',
  columns: [
    ORDER_COLUMN,
    { label: 'Autor', value: (t) => t.author, link: true, sort: 'author' },
    { label: 'Cargo / empresa', value: (t) => [t.role, t.company].filter(Boolean).join(' — ') || '—' },
    { label: 'Nota', value: (t) => '★'.repeat(t.rating), sort: 'rating' },
  ],
  defaults: { rating: 5, active: true, displayOrder: 0 },
  toForm: (t) => ({ ...t }),
  fields: [
    { name: 'author', label: 'Autor', required: true },
    { name: 'role', label: 'Cargo' },
    { name: 'company', label: 'Empresa' },
    {
      name: 'rating', label: 'Nota', type: 'select',
      options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${'★'.repeat(n)} (${n})` })),
    },
    { name: 'content', label: 'Depoimento', type: 'textarea', rows: 5, required: true, full: true },
    ORDER_FIELD,
    ACTIVE_FIELD,
  ],
  sections: [
    { title: 'Quem falou', fields: ['author', 'role', 'company', 'rating'] },
    { title: 'Depoimento', fields: ['content'] },
  ],
  sidebar: ['active', 'displayOrder'],
});

const banners = resourceController({
  path: 'banners',
  section: 'banners',
  singular: 'Banner',
  plural: 'Banners da home',
  schema: 'banner',
  multipart: true,
  repo: () => repositories.banners,
  searchColumns: ['title', 'alt', 'href'],
  searchPlaceholder: 'Buscar banner…',
  columns: [
    ORDER_COLUMN,
    { label: 'Imagem', image: (b) => b.image },
    { label: 'Nome', value: (b) => b.title, link: true, sort: 'title' },
    { label: 'Link', value: (b) => b.href || '—', sort: 'href' },
    { label: 'Celular', value: (b) => (b.mobileImage ? 'Sim' : 'Não aparece'), nowrap: true },
  ],
  defaults: { active: true, displayOrder: 0 },
  toForm: (b) => ({ ...b }),
  keepOnError: ['image', 'mobileImage'],
  fields: [
    { name: 'title', label: 'Nome (uso interno)', required: true },
    { name: 'href', label: 'Link ao clicar', hint: 'Ex.: /orcamento, /portfolio ou https://...' },
    {
      name: 'alt', label: 'Texto do banner', type: 'textarea', rows: 3, required: true, full: true,
      hint: 'Escreva o que está escrito na imagem. Leitores de tela e o Google usam este texto.',
    },
    {
      name: 'image', label: 'Imagem para computador e tablet', type: 'file', required: true, full: true,
      ratio: '3', crop: '3', hint: 'Proporção 3:1, ideal 2000×667 px. JPG, PNG ou WebP até 5 MB.',
    },
    {
      name: 'mobileImage', label: 'Imagem para celular (opcional)', type: 'file', full: true,
      ratio: 'portrait', crop: '0.8,1,free', removeName: 'removeMobileImage',
      hint: 'Vertical ou quadrada, ex.: 1080×1350 px. Sem ela, este banner não aparece no celular.',
    },
    ORDER_FIELD,
    ACTIVE_FIELD,
  ],
  sections: [
    { title: 'Banner', fields: ['title', 'href', 'alt'] },
    { title: 'Imagem principal', fields: ['image'] },
    { title: 'Imagem para celular', fields: ['mobileImage'] },
  ],
  sidebar: ['active', 'displayOrder'],
  prepare(req, item, data) {
    const errors = { ...req.uploadErrors };
    const image = uploadedUrl(req, 'image');
    const mobileImage = uploadedUrl(req, 'mobileImage');
    if (!image && !item?.image && !errors.image) errors.image = 'Envie a imagem do banner.';
    if (!data) return { data, errors };
    const { removeMobileImage, ...fields } = data;
    let mobile = item?.mobileImage ?? null;
    if (mobileImage) mobile = mobileImage;
    else if (removeMobileImage) mobile = null;
    return { data: { ...fields, image: image || item?.image, mobileImage: mobile }, errors };
  },
  afterSave(item, data) {
    if (!item) return;
    if (item.image !== data.image) removeUploadedFile(item.image);
    if (item.mobileImage !== data.mobileImage) removeUploadedFile(item.mobileImage);
  },
  afterRemove(item) {
    removeUploadedFile(item.image);
    removeUploadedFile(item.mobileImage);
  },
  discard: discardUploads,
});

module.exports = { plans, faq, testimonials, banners };
