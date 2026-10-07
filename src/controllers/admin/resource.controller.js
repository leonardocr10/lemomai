/**
 * Controller genérico de cadastro (listar, criar, editar, excluir) usado por
 * planos, FAQ e depoimentos. Cada recurso descreve suas colunas e campos
 * em controllers/admin/resources.js.
 */
const HttpError = require('../../utils/http-error');
const adminService = require('../../services/admin.service');
const { validateAdmin } = require('../../validators/admin.validator');

const isUniqueError = (err) => err?.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message);

function resourceController(def) {
  const base = `/admin/${def.path}`;

  async function findOr404(id) {
    const item = await def.repo().findById(id);
    if (!item) throw HttpError.notFound(`${def.singular} não encontrado.`);
    return item;
  }

  const renderForm = (res, status, { item, values, errors }) =>
    res.status(status).renderAdmin('resources/form', {
      title: item ? `Editar ${def.singular.toLowerCase()}` : `Novo ${def.singular.toLowerCase()}`,
      section: def.section,
      def,
      action: item ? `${base}/${item.id}` : base,
      values,
      errors,
    });

  async function save(req, res, item) {
    const result = validateAdmin(def.schema, req.body);
    if (!result.success) return renderForm(res, 422, { item, values: req.body, errors: result.errors });
    try {
      if (item) await def.repo().update(item.id, result.data);
      else await def.repo().create(result.data);
    } catch (err) {
      if (!isUniqueError(err) || !def.uniqueField) throw err;
      return renderForm(res, 422, { item, values: req.body, errors: { [def.uniqueField]: 'Já existe um cadastro com este valor.' } });
    }
    adminService.saved();
    return res.redirect(302, `${base}?salvo=1`);
  }

  return {
    async list(req, res, next) {
      try {
        const items = await def.repo().findAllAdmin();
        let notice = null;
        if (req.query.salvo) notice = 'Alterações salvas.';
        else if (req.query.excluido) notice = 'Item excluído.';
        res.renderAdmin('resources/list', { title: def.plural, section: def.section, def, items, notice });
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
        await findOr404(req.params.id);
        await def.repo().remove(req.params.id);
        adminService.saved();
        res.redirect(302, `${base}?excluido=1`);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { resourceController };
