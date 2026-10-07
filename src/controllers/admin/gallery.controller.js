/**
 * Galeria de imagens (/admin/galeria): lista com busca e paginação, envio de
 * várias imagens de uma vez, exclusão (bloqueada se um banner usa a imagem)
 * e busca em JSON para o seletor "Escolher da galeria" do cadastro de banner.
 */
const repositories = require('../../repositories');
const mediaService = require('../../services/media.service');
const { parseGrid, gridUrl, pageItems, PER_PAGE } = require('../../utils/admin-grid');
const { uploadedFiles, discardUploads, GALLERY_MAX_FILES } = require('../../middlewares/banner-upload');

const BASE = '/admin/galeria';
const GRID = { sortable: ['createdAt', 'name', 'size', 'width'], defaultSort: 'createdAt', defaultDir: 'desc' };
const SEARCH = ['name', 'url'];
const JSON_PAGE_SIZE = 24;

// Erros do envio, por código na URL (?erro=...): nunca texto livre vindo da URL.
const UPLOAD_ERRORS = {
  vazio: 'Escolha ao menos uma imagem JPG, PNG ou WebP.',
  invalido: 'Arquivo de imagem inválido. Use JPG, PNG ou WebP de até 5 MB.',
  limite: `Envie no máximo ${GALLERY_MAX_FILES} imagens por vez, de até 5 MB cada.`,
  emUso: 'Essa imagem está em uso por um banner. Troque a imagem do banner (ou exclua o banner) antes de excluí-la.',
};

function notice(query) {
  if (query.enviadas) return `${Number(query.enviadas) || 0} imagem(ns) adicionada(s) à galeria.`;
  if (query.excluida) return 'Imagem excluída da galeria.';
  return null;
}

async function withUsage(items) {
  return Promise.all(items.map(async (item) => ({ ...item, usage: await repositories.media.usageCount(item.url) })));
}

async function list(req, res, next) {
  try {
    const state = parseGrid(req.query, GRID);
    const { items, total } = await repositories.media.findPage({
      q: state.q, searchColumns: SEARCH, sort: state.sort, dir: state.dir, limit: state.per, offset: state.offset,
    });
    const pages = Math.max(1, Math.ceil(total / state.per));
    const url = (overrides) => gridUrl(BASE, state, GRID, overrides);
    if (state.page > pages) return res.redirect(302, url({ page: pages }));
    return res.renderAdmin('gallery/index', {
      title: 'Galeria',
      pretitle: 'Imagens enviadas para os banners',
      section: 'gallery',
      items: await withUsage(items),
      notice: notice(req.query),
      error: Object.hasOwn(UPLOAD_ERRORS, req.query.erro ?? '') ? UPLOAD_ERRORS[req.query.erro] : null,
      maxFiles: GALLERY_MAX_FILES,
      grid: {
        base: BASE, state, total, pages, perPage: PER_PAGE, pageItems: pageItems(state.page, pages), url,
        searchPlaceholder: 'Buscar pelo nome do arquivo…',
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function upload(req, res, next) {
  try {
    const files = uploadedFiles(req, 'files');
    if (!files.length) {
      discardUploads(req);
      const message = req.uploadErrors?.files || '';
      let code = 'vazio';
      if (/máximo/.test(message)) code = 'limite';
      else if (message) code = 'invalido';
      return res.redirect(302, `${BASE}?erro=${code}`);
    }
    await mediaService.register(files);
    return res.redirect(302, `${BASE}?enviadas=${files.length}`);
  } catch (err) {
    discardUploads(req);
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await mediaService.remove(req.params.id);
    if (result.reason === 'in-use') return res.redirect(302, `${BASE}?erro=emUso`);
    return res.redirect(302, `${BASE}?excluida=1`);
  } catch (err) {
    return next(err);
  }
}

/** GET /admin/galeria.json?q=&page= — usado pelo seletor do cadastro de banner. */
async function search(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const { items, total } = await repositories.media.findPage({
      q, searchColumns: SEARCH, limit: JSON_PAGE_SIZE, offset: (page - 1) * JSON_PAGE_SIZE,
    });
    res.json({
      ok: true,
      data: items.map(({ id, url, name, width, height }) => ({ id, url, name, width, height })),
      total,
      page,
      pages: Math.max(1, Math.ceil(total / JSON_PAGE_SIZE)),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, upload, remove, search };
