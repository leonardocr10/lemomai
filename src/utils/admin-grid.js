/**
 * Estado das listas do painel (busca, ordenação, paginação) lido da URL.
 * Tudo fica na query string: funciona sem JS e o link pode ser salvo.
 */
const PER_PAGE = [10, 25, 50];
const DEFAULT_PER = 25;
const MAX_QUERY = 100;

/**
 * @param {object} query  req.query
 * @param {object} options { sortable: string[], defaultSort, defaultDir }
 */
function parseGrid(query = {}, { sortable = [], defaultSort, defaultDir = 'asc' } = {}) {
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, MAX_QUERY) : '';
  const sort = sortable.includes(query.sort) ? query.sort : defaultSort;
  const dir = query.dir === 'asc' || query.dir === 'desc' ? query.dir : defaultDir;
  const per = PER_PAGE.includes(Number(query.per)) ? Number(query.per) : DEFAULT_PER;
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  return { q, sort, dir, page, per, offset: (page - 1) * per };
}

/** Monta o link da lista com o estado atual + mudanças, omitindo valores padrão. */
function gridUrl(base, state, options = {}, overrides = {}) {
  const next = { ...state, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(overrides)) {
    if (!['q', 'sort', 'dir', 'page', 'per'].includes(key) && value) params.set(key, value);
  }
  if (next.extra) for (const [key, value] of Object.entries(next.extra)) if (value && !(key in overrides)) params.set(key, value);
  if (next.q) params.set('q', next.q);
  if (next.sort && next.sort !== options.defaultSort) params.set('sort', next.sort);
  if (next.dir && next.dir !== (options.defaultDir || 'asc')) params.set('dir', next.dir);
  if (next.page > 1) params.set('page', String(next.page));
  if (next.per && next.per !== DEFAULT_PER) params.set('per', String(next.per));
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

/** Páginas exibidas na paginação: 1 … 5 6 7 … 12 */
function pageItems(page, pages) {
  const shown = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  if (pages <= 5) for (let n = 1; n <= pages; n++) shown.add(n);
  const sorted = [...shown].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push('…');
    items.push(n);
  });
  return items;
}

module.exports = { parseGrid, gridUrl, pageItems, PER_PAGE, DEFAULT_PER };
