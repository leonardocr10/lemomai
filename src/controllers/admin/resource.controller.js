/**
 * Controller genérico de cadastro (listar com busca/ordenação/paginação,
 * criar, editar, excluir e ações em massa) usado por banners, planos, FAQ e
 * depoimentos. Cada recurso descreve colunas e campos em controllers/admin/resources.js.
 */
const HttpError = require('../../utils/http-error');
const { parseGrid, gridUrl, pageItems, PER_PAGE } = require('../../utils/admin-grid');
const adminService = require('../../services/admin.service');
const { validateAdmin } = require('../../validators/admin.validator');

const isUniqueError = (err) => err?.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message);

const BULK_ACTIONS = {
  activate: 'ativado(s)',
  deactivate: 'desativado(s)',
  delete: 'excluído(s)',
};

/** ids[] do formulário de ações em massa: só inteiros positivos, sem repetição, no máximo 200. */
const parseIds = (value) =>
  [...new Set([].concat(value || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 200);

function listNotice(query) {
  if (query.salvo) return 'Alterações salvas.';
  if (query.excluido) return 'Item excluído.';
  if (query.lote !== undefined && BULK_ACTIONS[query.acao]) return `${Number(query.lote) || 0} item(ns) ${BULK_ACTIONS[query.acao]}.`;
  return null;
}

function resourceController(def) {
  const base = `/admin/${def.path}`;
  const gridOptions = {
    sortable: [...def.columns.filter((column) => column.sort).map((column) => column.sort), 'active'],
    defaultSort: 'displayOrder',
    defaultDir: 'asc',
  };
  const fieldsByName = Object.fromEntries(def.fields.map((field) => [field.name, field]));
  // Layout do formulário: seções principais + coluna lateral (publicação).
  const layout = {
    sections: def.sections.map((section) => ({ ...section, fields: section.fields.map((name) => fieldsByName[name]) })),
    sidebar: def.sidebar.map((name) => fieldsByName[name]),
  };

  async function findOr404(id) {
    const item = await def.repo().findById(id);
    if (!item) throw HttpError.notFound(`${def.singular} não encontrado.`);
    return item;
  }

  const renderForm = (res, status, { item, values, errors }) =>
    res.status(status).renderAdmin('resources/form', {
      title: item ? `Editar ${def.singular.toLowerCase()}` : `Novo ${def.singular.toLowerCase()}`,
      pretitle: def.plural,
      section: def.section,
      useCropper: def.multipart,
      def,
      layout,
      action: item ? `${base}/${item.id}` : base,
      values,
      errors,
    });

  // Ao reexibir o formulário com erro, mantém o que foi digitado e os campos
  // que não vêm no corpo (ex.: prévia das imagens já salvas).
  const formValues = (req, item) => ({
    ...req.body,
    ...Object.fromEntries((def.keepOnError || []).map((key) => [key, item?.[key]])),
  });

  async function save(req, res, item) {
    const result = validateAdmin(def.schema, req.body);
    let errors = result.success ? {} : result.errors;
    let data = result.success ? result.data : null;
    // Ganchos opcionais: prepare (arquivos enviados), afterSave (limpeza), discard (descarta uploads).
    if (def.prepare) {
      const prepared = await def.prepare(req, item, data);
      errors = { ...errors, ...prepared.errors };
      data = prepared.data;
    }
    const fail = (fieldErrors) => {
      def.discard?.(req);
      return renderForm(res, 422, { item, values: formValues(req, item), errors: fieldErrors });
    };
    if (Object.keys(errors).length) return fail(errors);
    try {
      if (item) await def.repo().update(item.id, data);
      else await def.repo().create(data);
    } catch (err) {
      if (!isUniqueError(err) || !def.uniqueField) {
        def.discard?.(req);
        throw err;
      }
      return fail({ [def.uniqueField]: 'Já existe um cadastro com este valor.' });
    }
    await def.afterSave?.(item, data, req);
    adminService.saved();
    return res.redirect(302, `${base}?salvo=1`);
  }

  return {
    async list(req, res, next) {
      try {
        const state = parseGrid(req.query, gridOptions);
        const { items, total } = await def.repo().findPage({
          q: state.q,
          searchColumns: def.searchColumns,
          sort: state.sort,
          dir: state.dir,
          limit: state.per,
          offset: state.offset,
        });
        const pages = Math.max(1, Math.ceil(total / state.per));
        if (state.page > pages) return res.redirect(302, gridUrl(base, state, gridOptions, { page: pages }));
        return res.renderAdmin('resources/list', {
          title: def.plural,
          section: def.section,
          actions: [{ href: `${base}/novo`, label: `Novo ${def.singular.toLowerCase()}`, icon: 'plus' }],
          def,
          items,
          notice: listNotice(req.query),
          grid: {
            base,
            state,
            total,
            pages,
            perPage: PER_PAGE,
            pageItems: pageItems(state.page, pages),
            url: (overrides) => gridUrl(base, state, gridOptions, overrides),
            searchPlaceholder: def.searchPlaceholder,
          },
        });
      } catch (err) {
        next(err);
      }
    },
    async bulk(req, res, next) {
      try {
        const action = req.body?.action;
        if (!BULK_ACTIONS[action]) throw HttpError.badRequest('Ação em massa inválida.');
        let done = 0;
        for (const id of parseIds(req.body.ids)) {
          const item = await def.repo().findById(id);
          if (!item) continue;
          if (action === 'delete') {
            await def.repo().remove(id);
            def.afterRemove?.(item);
          } else {
            await def.repo().update(id, { active: action === 'activate' });
          }
          done += 1;
        }
        adminService.saved();
        res.redirect(302, `${base}?lote=${done}&acao=${action}`);
      } catch (err) {
        next(err);
      }
    },
    newForm(req, res) {
      renderForm(res, 200, { item: null, values: def.toForm(def.defaults), errors: {} });
    },
    async create(req, res, next) {
      try {
        await save(req, res, null);
      } catch (err) {
        next(err);
      }
    },
    async editForm(req, res, next) {
      try {
        const item = await findOr404(req.params.id);
        renderForm(res, 200, { item, values: def.toForm(item), errors: {} });
      } catch (err) {
        next(err);
      }
    },
    async update(req, res, next) {
      try {
        await save(req, res, await findOr404(req.params.id));
      } catch (err) {
        next(err);
      }
    },
    async remove(req, res, next) {
      try {
        const item = await findOr404(req.params.id);
        await def.repo().remove(item.id);
        def.afterRemove?.(item);
        adminService.saved();
        res.redirect(302, `${base}?excluido=1`);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { resourceController };
